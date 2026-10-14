// การโจมตีปกติ: คำนวณดาเมจ (strike) + ลำดับบนกระดาน ตี → ตีสวน → ถอย (boardAttack)
//  ใครเรียกได้ตอนไหน (ตาเดิน/ระยะ) ตัดสินที่ phases/action.js — ไฟล์นี้แค่ลงผล
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  attackableTargets, attackSoundOf, computeAttackBase, strikeCard,
  estimateAttackOn, estimateHitOn, estimateCritOf, strike, skillStrike, skillDodge, doAttack, boardAttack, gunAttack,
});

const CHAR_HOOKS = require("../../characters/index");
const {
  statusAmtOf, poisonAtkPenalty, invertActive, accurateActive,
} = require("../../characters/_universal_status");
const { NETRAMANA_KILL_CHANCE, netramanaActive } = require("../../characters/_universal_status");
const Mark42 = require("../../characters/_mark42");
const Journey = require("../../characters/_journey");
const { ATTACKFX_TIME } = require("../constants");
const Board = require("../board");
const match = require("../match");
const { engine } = require("../engine");
const combat = require("../combat");
const cutscene = require("../cutscene");
const action = require("./action");
const lobby = require("../lobby");
const timers = require("../timers");
const view = require("../view");
const Visibility = require("../visibility");
const Ice = require("../ice");
const Zero = require("../zeroTime");

function attackableTargets(atkId) {
  const attacker = match.players[atkId];
  return combat.alivePlayers().filter((p) => p.id !== atkId && !combat.sameTeam(attacker, p));
}

// เสียงโจมตีปกติเฉพาะตัวละคร (คีย์ใน client/src/audio.js) — undefined = ใช้เสียง "attack" กลาง
function attackSoundOf(attacker) {
  if (!attacker) return undefined;
  const hook = CHAR_HOOKS[attacker.characterId];
  return hook && hook.attackSound ? hook.attackSound(attacker) : undefined; // มุยมิ (ดาบสะบั้น) · นักบินปริศนา · โซระ (มีด/ปืน)
}
// อัตราคริติคอลเฉพาะตัว (%) ของผู้ตี (ฮุค critPct — โซระ: ร่าง My-Th 20%) — รวมกับคริของสนามแล้วทอยครั้งเดียว
function ownCritPct(attacker) {
  const hook = attacker && CHAR_HOOKS[attacker.characterId];
  return (hook && hook.critPct && hook.critPct(attacker)) || 0;
}
// ลำแสงตีปกติ (ฮุค attackBeam ของตัวละคร) — ความยาวลำแสงเป็นช่อง · 0 = ตีแบบปกติ (พุ่งชน/ฟัน)
function attackBeamOf(attacker) {
  const hook = attacker && CHAR_HOOKS[attacker.characterId];
  return (hook && hook.attackBeam && hook.attackBeam(attacker)) || 0;
}

// ค่าจากฮุคแบบไม่มีพารามิเตอร์อื่น (ไม่มีฮุค/ไม่มีค่า = null)
function hookOf(attacker, name) {
  const hook = attacker && CHAR_HOOKS[attacker.characterId];
  return (hook && hook[name] && hook[name](attacker)) || null;
}

// ท่าตีปกติเฉพาะตัว (ฮุค attackStyle — Echo: คลื่นเสียง / ผมฟาด / ปาหิน ตามร่างและระยะ) · null = ตีแบบปกติ (พุ่งชน)
function attackStyleOf(attacker, target) {
  const hook = attacker && CHAR_HOOKS[attacker.characterId];
  if (!hook || !hook.attackStyle || !attacker.pos || !target || !target.pos) return null;
  return hook.attackStyle(attacker, Board.dist(Board.boxOf(attacker), Board.boxOf(target))) || null;
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
  // ช่องพิเศษ (GRID_PLAN §3.1): ยืนบนแท่นพลัง พลังโจมตี +1 — ungated ใครยืนก็ได้
  //  ตัวใหญ่ (Echo ขยายร่าง) ไม่ได้โบนัสจากช่องที่ยืน
  const terrainAtk = attacker.pos && action.sizeOf(attacker) <= 1 ? Board.terrainAtk(action.boardMap(), attacker.pos.x, attacker.pos.y) : 0;
  // ห่วงเวลาซีโร่ (GRID_PLAN §8.2): เฟส 3 +1 · เฟส 4 +2 — ทุกคน ungated
  const zeroAtkFx = Zero.attackBonus();
  const zeroAtk = zeroAtkFx ? zeroAtkFx.amount : 0;
  const base = baseHook + hookBonus + mark42Atk + journeyAtk + giftAtk + terrainAtk + zeroAtk + (empowerAtk ? 1 : 0) + cardAtkBonus;
  return {
    base,
    empowerAtk, cardAtkBonus, mark42Atk, journeyAtkFx, terrainAtk, zeroAtkFx,
    ...hookCtx,
  };
}

// ทอยหลบจากช่องที่เป้ายืน (พุ่มดอกไม้สูง/ป่าทึบ — GRID_PLAN §3.1) → หลบพ้น = ข้อมูลช่อง { name, icon, pct } · ไม่พ้น/ไม่มี = null
//  ทอยเฉพาะตอนเป้ายืนบนช่องที่หลบได้ (ช่องอื่นไม่แตะ Math.random) · ผู้เรียกเช็ค "แม่นยำ" เอง
function terrainCoverDodge(target) {
  if (!target || !target.pos || action.sizeOf(target) > 1) return null; // ตัวใหญ่หลบในพุ่มไม่ได้
  const cover = Board.terrainEvade(action.boardMap(), target.pos.x, target.pos.y);
  return cover && Math.random() * 100 < cover.pct ? cover : null;
}

// ประเมินพลังโจมตีปกติที่ attacker จะฟาดใส่ target ได้ (engine.attackPowerAgainst)
//  อ่านจากท่อเดียวกับการโจมตีจริง (computeAttackBase) แต่เป็นแค่ "ค่าประเมิน" — โบนัสที่ตัดสินตอนตีจริง
//  (สังหารทันที/หลบหลีก/ลดดาเมจฝั่งรับ) ไม่ถูกนับ · ห่อ try/catch กันโค้ดตัวละครพัง
function estimateAttackOn(attacker, target) {
  try {
    const hook = CHAR_HOOKS[attacker.characterId];
    const fixed = hook && hook.fixedStrikeDamage ? hook.fixedStrikeDamage(engine, attacker, target) : null;
    if (Number.isFinite(fixed)) return Math.max(0, fixed);
    const c = computeAttackBase(engine, attacker, target);
    return Math.max(0, c.base || 0);
  } catch { return null; }
}

// ประเมินโอกาสตีปกติ "โดน" (%) — อ่านด่านพลาดเดียวกับ strike() ตามลำดับ แต่ไม่ทอย/ไม่แตะสถานะ
//  แม่นยำ = 100 (เจาะการหลบหลีกทุกแบบ) · ไม่งั้นคูณโอกาสรอดแต่ละด่าน:
//  หลบหลีกของเป้า (statusAmt หรือ 100%) × ช่องที่เป้ายืน (พุ่มดอกไม้สูง/ป่าทึบ) × ป่าไม้ต้องสาปกลางวัน
//  ไม่นับเนตรมณะ (สังหารทันทีไม่ใช่การพลาด) · คืนจำนวนเต็ม 0–100 · พัง = null
function estimateHitOn(attacker, target) {
  try {
    if (accurateActive(attacker)) return 100;
    const pct = (v) => Math.min(100, Math.max(0, Number(v) || 0));
    const evadePct = (target.statuses.evade || 0) > 0 ? pct(statusAmtOf(target, "evade") || 100) : 0;
    const cover = target.pos && action.sizeOf(target) <= 1 ? Board.terrainEvade(action.boardMap(), target.pos.x, target.pos.y) : null;
    const coverPct = cover ? pct(cover.pct) : 0;
    const missPct = pct(Journey.attackMissPct(engine));
    const hit = (100 - evadePct) * (100 - coverPct) * (100 - missPct) / 10000;
    return Math.round(hit);
  } catch { return null; }
}

// ประเมินโอกาสคริติคอล (%) ของตีปกติ — อัตราเดียวกับที่ Journey.applyCrit ใช้ใน strike() (สนาม + คริเฉพาะตัว)
//  ไม่ทอย · คืนจำนวนเต็ม 0–100 · พัง = null
function estimateCritOf(attacker, target) {
  try {
    return Math.round(Math.min(100, Math.max(0, Journey.critBonus(engine) + ownCritPct(attacker))));
  } catch { return null; }
}

// ลงผลการตีปกติ 1 ครั้ง (ใช้ทั้งตีและตีสวน) — คืน { dmg, dodge, kill, skills }
//  ไม่แตะ gameState/ตัวจับเวลา (คนเรียกจัดฉากเอง) · counter = ตีสวน (ข้อความ log ต่างกันเท่านั้น)
function strike(attacker, target, { counter = false } = {}) {
  if (!match.effectSourceId) return combat.withEffectSource(attacker, () => strike(attacker, target, { counter }));
  const verb = counter ? "ตีสวน" : "โจมตี";
  attacker.didAttackRound = true;
  // "แม่นยำ" (บัฟ Universal): เจาะการหลบหลีกทุกแบบของเป้าหมาย (โล่กันครั้งยังกันได้ตามปกติ)
  const accurate = accurateActive(attacker);

  // หลบหลีก (สถานะ Universal): หลบการโดนโจมตีตาม % ที่ระบุ (ไม่ระบุ = 100%)
  //  ทอยทุกครั้งที่ถูกโจมตีตลอดเทิร์นที่ติดอยู่ — ไม่มีอะไรถูกใช้หมด (หมดอายุตามเทิร์นที่ endTurn)
  if (!accurate && (target.statuses.evade || 0) > 0) {
    const evadePct = statusAmtOf(target, "evade") || 100;
    if (Math.random() * 100 < evadePct) {
      // patch 2.1.3.5: ถูกโจมตีไม่ได้แต้มสกิลอีกต่อไป (แม้หลบพ้น)
      target.wasAttacked = true;
      match.lastLog.push(`💨 หลบหลีก! ${target.name} หลบการ${verb}ของ ${attacker.name} ได้ (${evadePct}%)`);
      return {
        dmg: 0, dodge: true, kill: false,
        skills: [{ name: `หลบหลีก (${evadePct}%)`, img: null, by: target.name, color: lobby.colorOf(target), side: "def" }],
      };
    }
    match.lastLog.push(`💨 ${target.name} พยายามหลบ (${evadePct}%) แต่ไม่พ้น — การโจมตีดำเนินต่อ`);
  }
  // ช่องพิเศษ (GRID_PLAN §3.1): เป้ายืนในพุ่มดอกไม้สูง/ป่าทึบ หลบได้อีก 20% (ทอยแยกหลังสถานะหลบหลีก · แม่นยำเจาะได้)
  const cover = !accurate && terrainCoverDodge(target);
  if (cover) {
    target.wasAttacked = true;
    match.lastLog.push(`${cover.icon} ${target.name} หลบการ${verb}ของ ${attacker.name} ใน${cover.name}ได้ (${cover.pct}%)`);
    return {
      dmg: 0, dodge: true, kill: false,
      skills: [{ name: `${cover.name} — หลบหลีก ${cover.pct}%`, img: null, by: target.name, color: lobby.colorOf(target), side: "def" }],
    };
  }

  // ---------- "เนตรมณะ" (สถานะ Universal patch 2.2.7) ----------
  //  ใครก็ตามที่ติดบัฟนี้ โจมตีปกติแล้วมีโอกาสสังหารเป้าหมายทันที NETRAMANA_KILL_CHANCE
  if (netramanaActive(attacker) && Math.random() < NETRAMANA_KILL_CHANCE) {
    combat.instantDeath(target);
    target.wasAttacked = true;
    if (!target.alive) match.lastLog.push(`👁️✨💀 เนตรมณะ — ${attacker.name} มองทะลุความตายของ ${target.name} (โอกาส ${Math.round(NETRAMANA_KILL_CHANCE * 100)}%) — สังหารทันที!`);
    else match.lastLog.push(`👁️✨💀 เนตรมณะ — ${attacker.name} มองทะลุความตายของ ${target.name} — แต่ ${target.name} รอดไปได้!`);
    return {
      dmg: 0, dodge: false, kill: !target.alive,
      skills: [{ name: "เนตรมณะ — สังหารทันที", img: null, by: attacker.name, color: lobby.colorOf(attacker), side: "atk" }],
    };
  }

  // โอกาสสังหารทันทีเฉพาะตัวละคร (ฮุค killChance — Echo ขยายร่างครบ 10 ระดับ 5%)
  const hookKill = CHAR_HOOKS[attacker.characterId] && CHAR_HOOKS[attacker.characterId].killChance
    ? CHAR_HOOKS[attacker.characterId].killChance(attacker) : 0;
  if (hookKill > 0 && Math.random() < hookKill) {
    combat.instantDeath(target);
    target.wasAttacked = true;
    match.lastLog.push(!target.alive
      ? `💀 ${attacker.name} สังหาร ${target.name} ทันที (โอกาส ${Math.round(hookKill * 100)}%)`
      : `💀 ${attacker.name} พยายามสังหาร ${target.name} ทันที — แต่ ${target.name} รอดไปได้!`);
    return {
      dmg: 0, dodge: false, kill: !target.alive,
      skills: [{ name: `สังหารทันที (${Math.round(hookKill * 100)}%)`, img: null, by: attacker.name, color: lobby.colorOf(attacker), side: "atk" }],
    };
  }

  // การเดินทาง (ป่าไม้ต้องสาป กลางวัน): โจมตีพลาด 40% — ฝั่งผู้ตีพลาดเอง แต่ "แม่นยำ" ก็เจาะได้เหมือนด่านหลบ
  const miss = !accurate && Journey.tryAttackMiss(engine, attacker, target);
  if (miss) return { dmg: 0, dodge: true, kill: false, skills: [{ ...miss, by: attacker.name, color: lobby.colorOf(attacker), side: "atk" }] };

  const atkCtx = computeAttackBase(engine, attacker, target);
  let { base } = atkCtx;
  const { empowerAtk, cardAtkBonus, mark42Atk, journeyAtkFx, terrainAtk, zeroAtkFx, muimiTowerAtk } = atkCtx;
  // ผกผัน (สถานะ Universal patch 2.2.1): โบนัสพลังโจมตีที่ควรได้ กลับกลายเป็นลดพลังโจมตีแทน (คำนวณรอบเพดานฐาน 1 หน่วย)
  if (invertActive(attacker)) base = Math.max(0, 1 - (base - 1));
  // ดาเมจตายตัวของตีปกติ (ฮุค fixedStrikeDamage — เอมิลิโกะ เครื่องดูดฝุ่น: เท่าระยะ) = ไม่รับบัฟ/ดีบัฟฝั่งผู้ตี ไม่ติดคริติคอล
  //  (คุ้มครอง/ขัดแย้ง/เปราะบางของเป้ายังมีผล)
  const fixedHook = CHAR_HOOKS[attacker.characterId];
  const fixed = fixedHook && fixedHook.fixedStrikeDamage ? fixedHook.fixedStrikeDamage(engine, attacker, target) : null;
  const isFixed = Number.isFinite(fixed);
  let dmg = isFixed ? fixed : base;
  // เสริมพลัง / อ่อนแอ (สถานะพื้นฐาน patch 2.0.8): เพิ่ม/ลดดาเมจที่ทำได้ตามจำนวนที่ระบุ
  const mightAtk = isFixed ? 0 : statusAmtOf(attacker, "might");
  if (mightAtk > 0) dmg += mightAtk;
  //  "พิษร้าย" หักพลังโจมตีเหมือน "อ่อนแอ" — ซ้อนกันได้ จึงรวมกันก่อนหักทีเดียว
  const weakAtk = isFixed ? 0 : statusAmtOf(attacker, "weak") + poisonAtkPenalty(attacker);
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
  if (!isFixed) dmg = Journey.applyCrit(engine, attacker, dmg, journeyCritFx, ownCritPct(attacker));

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
  match.lastLog.push(`${attacker.name} ${verb} ${target.name} -${dmg} (ลดเกราะก่อน)`);
  // ผลเมื่อตีปกติลงเฉพาะตัวละคร (ฮุค onStrikeLanded — ไรโด ฮิคารุ: ติดสถานะตามร่าง) → ชื่อป้ายในฉากตี
  const landedHook = CHAR_HOOKS[attacker.characterId];
  const landedFx = landedHook && landedHook.onStrikeLanded && target.alive ? landedHook.onStrikeLanded(engine, attacker, target, { counter }) || [] : [];
  // เลือดหมดจากการตี = ตกรอบทันที (เดิมกวาดตอนจบเทิร์น — บนกระดานคนตายต้องหายจากช่องก่อนตีสวน/คนถัดไป)
  if (target.alive && target.hp <= 0) {
    combat.instantDeath(target);
    if (!target.alive) match.lastLog.push(`💀 ${target.name} เลือดจริงหมด ตกรอบ!`);
  }

  // สกิลที่มีผลกับการโจมตีครั้งนี้ (โชว์ใต้อนิเมชัน แยกฝั่งชัดเจน: atk = ฝั่งโจมตี | def = ฝั่งป้องกัน)
  const fxSkills = [];
  const addFx = (x, side) => { if (x) fxSkills.push({ ...x, side }); };
  const atkFx = (name, img = view.displayImg(attacker)) => addFx({ name, img, by: attacker.name, color: lobby.colorOf(attacker) }, "atk");
  const defFx = (name, img = view.displayImg(target)) => addFx({ name, img, by: target.name, color: lobby.colorOf(target) }, "def");
  if (mark42Atk > 0) atkFx(`เกราะ Mark 42 +${mark42Atk}`, Mark42.IMG.suit);
  if (journeyAtkFx) atkFx(journeyAtkFx.name, null);
  if (zeroAtkFx) atkFx(zeroAtkFx.name, null);
  if (terrainAtk > 0) atkFx(`แท่นพลัง +${terrainAtk}`, null);
  for (const name of CHAR_HOOKS.oberon_summer.atkFx(attacker)) atkFx(name, CHAR_HOOKS.oberon_summer.IMG.base);
  // ป้ายโบนัสเฉพาะตัวของผู้ตี (ฮุค attackFxNames — โซระ: มีด +1)
  {
    const hook = CHAR_HOOKS[attacker.characterId];
    if (hook && hook.attackFxNames) for (const name of hook.attackFxNames(attacker, atkCtx)) atkFx(name);
  }
  for (const name of landedFx) atkFx(name);
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

  return { dmg, dodge: false, kill: !target.alive, crit: !!journeyCritFx.crit, skills: fxSkills };
}

// ดาเมจจากสกิลที่ "ตีด้วยพลังโจมตี" (เช่นคลื่นดาบของมุยมิ) — ไม่ทะลุอะไรเลย (GRID_PLAN §7.3):
//  หลบหลีกหลบได้ (แม่นยำเจาะได้) · คุ้มครองลด · ขัดแย้ง/เปราะบางเพิ่ม · เกราะ/โล่รับก่อน (dealMixed)
//  ต่างจากตีปกติ: ไม่นับเป็นการโจมตีปกติ (ไม่ตีสวน · ไม่ใช้เสริมพลัง · ไม่ติดผลตีปกติของตัวละคร · ไม่มีเนตรมณะ/ป่าพลาดเป้า)
//  คืน { dmg, dodge, kill }
function skillStrike(attacker, target, reason) {
  target.wasAttacked = true; // โดนสกิลแบบตีนับว่าถูกโจมตี (แม้หลบพ้น — แบบเดียวกับตีปกติ)
  if (skillDodge(attacker, target, reason)) return { dmg: 0, dodge: true, kill: false };
  const atkCtx = computeAttackBase(engine, attacker, target);
  let base = atkCtx.base - (atkCtx.empowerAtk ? 1 : 0); // เสริมพลังใช้กับตีปกติเท่านั้น
  if (invertActive(attacker)) base = Math.max(0, 1 - (base - 1));
  let dmg = base + statusAmtOf(attacker, "might");
  dmg = Math.max(0, dmg - (statusAmtOf(attacker, "weak") + poisonAtkPenalty(attacker)));
  const guardAmt = (target.statuses.guard || 0) > 0 ? (statusAmtOf(target, "guard") || 1) : 0;
  dmg = Math.max(0, dmg - guardAmt);
  if ((target.statuses.discord || 0) > 0) dmg += 1;
  dmg += statusAmtOf(target, "fragile");
  combat.dealMixed(target, dmg, true);
  match.lastLog.push(`${attacker.name} ${reason} → ${target.name} -${dmg} (ลดเกราะก่อน)`);
  if (target.alive && target.hp <= 0) {
    combat.instantDeath(target);
    if (!target.alive) match.lastLog.push(`💀 ${target.name} เลือดจริงหมด ตกรอบ!`);
  }
  if (!target.alive) target.pos = null;
  return { dmg, dodge: false, kill: !target.alive };
}

// ทอยหลบสกิลที่หลบได้: หลบหลีก (สถานะ) แล้วช่องที่ยืน (พุ่มดอกไม้สูง/ป่าทึบ) · แม่นยำเจาะได้ → true = หลบพ้น (บันทึก log ให้)
//  skillStrike ใช้ · ดาเมจสกิลตายตัวที่สเปกบอกว่า "หลบได้" เรียกตรง (engine.skillDodge — โซระ: Mouse Separade)
function skillDodge(attacker, target, reason) {
  if (accurateActive(attacker)) return false;
  if ((target.statuses.evade || 0) > 0) {
    const evadePct = statusAmtOf(target, "evade") || 100;
    if (Math.random() * 100 < evadePct) {
      match.lastLog.push(`💨 ${target.name} หลบ${reason} ได้ (${evadePct}%)`);
      return true;
    }
  }
  const cover = terrainCoverDodge(target); // พุ่มดอกไม้สูง/ป่าทึบ +20%
  if (cover) {
    match.lastLog.push(`${cover.icon} ${target.name} หลบ${reason}ใน${cover.name}ได้ (${cover.pct}%)`);
    return true;
  }
  return false;
}

// การ์ดฉากตี 1 จังหวะ (ตี หรือ ตีสวน) — client วาดใครตีใคร + เหตุผลดาเมจ
function strikeCard(attacker, target, res) {
  return {
    byId: attacker.id, targetId: target.id,
    byName: attacker.name, byImg: view.displayImg(attacker), byColor: lobby.colorOf(attacker),
    byAttackSound: attackSoundOf(attacker), // เสียงโจมตีปกติเฉพาะตัว
    byBeam: attackBeamOf(attacker), // ตีปกติเป็นลำแสง (ความยาวเป็นช่อง · 0 = ไม่มี) — นักบินปริศนา · โซระ (ปืน)
    byBeamTone: hookOf(attacker, "attackBeamTone"), // สีลำแสง "blue" (โซระ) · null = ขาวแดงเดิม
    byHitFx: hookOf(attacker, "attackHitFx"), // เอฟเฟกต์จังหวะปะทะ "mythSlash" (โซระ มีด) · null = แสงแตกเดิม
    byStyle: attackStyleOf(attacker, target), // ท่าตีเฉพาะตัว "echo" | "hair" | "rock" (Echo) — null = พุ่งชน
    bySize: action.sizeOf(attacker), // ขนาดตัวผู้ตี (ตัวใหญ่ — เอฟเฟกต์เริ่มจากตัวทั้งก้อน)
    targetName: target.name, targetImg: view.displayImg(target), targetColor: lobby.colorOf(target),
    dmg: res.dmg, dodge: !!res.dodge, kill: !!res.kill, crit: !!res.crit, skills: res.skills || [], // crit = คริติคอลติด (ฉากบนกระดานขึ้นป้าย)
  };
}

// ตี 1 ครั้งแบบไม่มีกระดาน (ไม่มีตีสวน/ถอย/ฉาก) — engine.doAttack ให้เทสต์ท่อดาเมจ + โค้ดตัวละครเรียกใช้
//  ตั้ง lastAttack ไว้ให้อ่านผล · ไม่แตะ gameState/ตัวจับเวลา
function doAttack(byId, targetId) {
  const attacker = match.players[byId];
  const target = match.players[targetId];
  if (!attacker || !attacker.alive || !target || !target.alive || target.id === attacker.id || combat.sameTeam(attacker, target)) return null;
  const res = strike(attacker, target);
  match.lastAttack = { id: ++match.attackSeq, ...strikeCard(attacker, target, res), fxMs: ATTACKFX_TIME * 1000 };
  return res;
}

// โจมตีบนกระดาน (GRID_PLAN §6): ตี → ถ้าเป้ายังรอดและตีถึงเรา = ตีสวน → ผู้ตีถอย 1 ช่อง (ชนของ = เสีย 1)
//  จบฉาก (ATTACKING) แล้วเรียก done (= จบตาของผู้ตี)
//  ฮุค afterBoardAttack(engine, attacker, target, res) → ฟังก์ชันที่ทำหลังฉากตีจบ ก่อนจบตา (โซระ ปืน: ดึงเป้าเข้าประชิด)
//  ตีแนวตรง (action.lanes — ไรโด ฮิคารุ): ศัตรูคนอื่นในแนวเดียวกันโดนตีปกติด้วย (card.extra) · ตีสวนได้แค่เป้าหลัก
function boardAttack(attacker, target, done) {
  const lane = action.laneVictims(attacker, target);
  const first = strike(attacker, target);
  const card = { id: ++match.attackSeq, ...strikeCard(attacker, target, first), counter: null, push: null };
  if (lane) {
    card.byLane = lane.tiles;
    card.extra = [];
    for (const id of lane.ids) {
      const o = match.players[id];
      if (!o || !o.alive || !attacker.alive) continue;
      const r = strike(attacker, o);
      card.extra.push({ targetId: o.id, targetName: o.name, dmg: r.dmg, dodge: !!r.dodge, kill: !!r.kill, crit: !!r.crit });
    }
    Visibility.onAreaHit(attacker, lane.ids); // คนล่องหนในแนวโดน = ปรากฏตัว
  }
  const slide = counterAndPush(attacker, target, card);
  const hook = CHAR_HOOKS[attacker.characterId];
  const after = hook && hook.afterBoardAttack ? hook.afterBoardAttack(engine, attacker, target, first) : null;
  playAttackCard(card, attacker, target, slideThen(slide, target, after ? () => { combat.withEffectSource(attacker, after); done(); } : done));
}
// ยิงปืน GUTS บนกระดาน (ผลของกระสุนลงไปแล้วก่อนเรียก): ฉากยิง + ตีสวน/ถอยแบบเดียวกับตีปกติ
//  card.gun = ชนิดกระสุน (dmg ของจังหวะแรกเป็น 0 — ผลจริงอยู่ใน log ตามชนิดกระสุน)
function gunAttack(shooter, target, ammo, done) {
  target.wasAttacked = true; // ถูกยิงนับว่าถูกโจมตี
  const card = { id: ++match.attackSeq, ...strikeCard(shooter, target, { dmg: 0, kill: !target.alive }), gun: ammo, counter: null, push: null };
  const slide = counterAndPush(shooter, target, card);
  playAttackCard(card, shooter, target, slideThen(slide, target, done));
}
// ถอยลงน้ำแข็ง: ไถลต่อหลังฉากตีจบ (ก่อนผลหลังฉากตี/จบตา) — ชนตามกติกาไถลทุกอย่าง · ต้นตอ = คนที่ตีสวน
function slideThen(slide, by, done) {
  if (!slide) return done;
  return () => { Ice.forcedSlides([slide], by); done(); };
}
// เป้ารอด + มีความสามารถตีสวน (action.counters — ตอนนี้ไม่มีตัวละครไหนมี) + ผู้ตีอยู่ในระยะตีของเป้า
//  → ตีสวน 1 ครั้ง แล้วผู้ตีถอย 1 ช่อง (ถอยไม่ได้ = ชน เสียเพิ่ม 1) — เขียนผลลง card
//  คืน { id, to, dir } = ถอยลงน้ำแข็ง (ไถลต่อหลังฉากตี — slideThen) | null
function counterAndPush(attacker, target, card) {
  let slide = null;
  if (action.counters(target) && attacker.alive && target.alive && attacker.pos && target.pos && Board.canCounter(action.rangeOf(target), attacker.pos, target.pos)) {
    const back = strike(target, attacker, { counter: true });
    card.counter = strikeCard(target, attacker, back);
    if (attacker.alive) {
      const push = Board.pushback(action.boardMap(), attacker.pos, target.pos, action.boardUnits(), { selfId: attacker.id, blocked: action.boardBlocked(attacker.id) });
      // ฉากตีเลื่อนแค่ช่องที่ถอยไป 1 ช่อง (push.via = ช่องน้ำแข็งแรกที่ถอยลง) · ไถลต่อ + ชนตามกติกาไถล = หลังฉากตี (Ice.forcedSlides
      //  — ผู้ใช้ตัดสิน 2026-10-14 "ไถลต่อตามสเปก") · card.push.via = null เสมอ (การไถลเล่นทาง iceFx)
      const to = push.via ? { ...push.via } : { x: push.x, y: push.y };
      const from = { ...attacker.pos };
      card.push = { from, to, collide: push.collide, via: null };
      if (push.moved) {
        attacker.pos = { ...to };
        match.lastLog.push(`↩️ ${attacker.name} ถอย 1 ช่อง`);
        slide = { id: attacker.id, to: { ...to }, dir: { x: to.x - from.x, y: to.y - from.y } };
      } else {
        combat.dealMixed(attacker, 1, true);
        match.lastLog.push(`💥 ${attacker.name} ถอยชนสิ่งกีดขวาง — เสียเพิ่ม -1`);
        if (attacker.alive && attacker.hp <= 0) {
          combat.instantDeath(attacker);
          if (!attacker.alive) match.lastLog.push(`💀 ${attacker.name} เลือดจริงหมด ตกรอบ!`);
        }
      }
    }
  }
  return slide;
}
// เล่นฉากตี (ATTACKING) แล้วเรียก done — คนตกรอบหายจากกระดานก่อน
function playAttackCard(card, attacker, target, done) {
  // คนตกรอบหายจากกระดาน
  for (const p of [attacker, target]) if (!p.alive) p.pos = null;
  for (const e of card.extra || []) { const o = match.players[e.targetId]; if (o && !o.alive) o.pos = null; }
  // มีข้อมูลสกิลให้อ่าน / มีตีสวน -> ยืดเวลาฉากให้อ่านทัน · คัตซีนที่ค้างคิวเล่นต่อหลังฉากตี
  const fxSeconds = ATTACKFX_TIME + (card.skills.length ? 2 : 0) + (card.counter ? 2 : 0);
  card.fxMs = fxSeconds * 1000;
  match.lastAttack = card;
  match.gameState = "ATTACKING";
  timers.startPhaseTimer(fxSeconds, () => cutscene.runCutsceneQueue(done));
  view.broadcastState();
}

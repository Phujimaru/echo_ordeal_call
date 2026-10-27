// ============================================================
//  ยูกิ มาโคโตะ (Persona 3) — เอาฮา · id "yuki_makoto" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.21 (2026-10-27)
//
//  ค่าพื้นฐาน: พลังชีวิต 3 / เกราะ 2 · เดิน 4 · ตีประชิด · พลังโจมตี 1 · มีแค่ท่าไม้ตาย (ไม่มีสกิลพื้นฐาน/รอง)
//  ติดตัว มิตรภาพ: ไม่ตาย ไม่ถูกสังหาร — ทุกทางที่ตาย (รวม force ของ Colony) ฟื้นทันทีด้วยพลังชีวิต/เกราะเต็ม (ฮุค deathless)
//    ยกเว้นระเบิดของยูกิอีกคน (combat.instantDeath "absolute")
//  ท่าไม้ตาย เกิดใหม่เป็นประตู (0 แต้ม): ตั้งท่าระเบิดตัวเอง นับถอยหลัง 3 เทิร์น (นับเทิร์นที่กด) · ใช้แล้วจบตาเดิน
//    ระหว่างนับ: ยืนนิ่ง ข้ามตาเดินทั้งตา (ฮุค skipsTurn) · เพลง Burn My Dread (skillMusic) · client มืดลง + ออร่ารวมที่ตัว (players[].yuki)
//    จบเทิร์นที่ 3 (กดเทิร์น N → จบเทิร์น N + 2): คลิปท่าไม้ตาย (ผู้ใช้สั่ง — เล่นตอนครบเวลา ไม่ใช่ตอนกด)
//    → คลิปจบ: ทุกคนบนแผนที่ตายแน่นอน ฟื้นไม่ได้ (absolute) + ฉากระเบิด 14 วิ (state.yukiBoom · client/src/board/YukiBoom.jsx)
//    → จบเกม ยูกิเป็นผู้ชนะ (engine.declareWinner)
//    เรียวกิตัดได้ (รากฐานจิต — severables) = เลิกนับถอยหลัง กดใหม่ได้
//  เสียงพากย์ (ไฟล์ผู้ใช้ ตัดเป็นท่อน): ตาเดินแรกของเกม · โดนตี
//
//  ยูกิหลายคน (ผู้ใช้สั่ง): คนที่ระเบิดก่อนฆ่ายูกิทุกคน · ครบพร้อมกัน = คนที่กดก่อน
//  Claude ตัดสินเอง (บอกผู้ใช้แล้ว): ระเบิดตอนจบเทิร์นที่ 3 ของการนับ · ถูกตัดแล้วไม่มีคูลดาวน์ · ไม่ unique
//   · ถูกผลัก/ดึงระหว่างนับยังขยับตามปกติ
//   · โหมดทีม/Moon Cell: ยูกิชนะคนเดียวตามสเปก (เพื่อนร่วมทีมตายด้วย · winningTeamId = ทีมของยูกิ)
// ============================================================

const ID = "yuki_makoto";
const DIR = "/characters/yuki_makoto";
const IMG = { base: `${DIR}/yuki_makoto.webp`, skill3: `${DIR}/yuki_skill3.webp` };
const VIDEO = { skill3: `${DIR}/yuki_skill3.mp4` };
const CUT = { ult: "yukiUlt" };
const MUSIC = "yuki_charge"; // Burn My Dread -Last Battle Reload- (client/src/audio.js)
const VOICE = {
  start: ["yuki_v_start1", "yuki_v_start2", "yuki_v_start3"],
  struck: ["yuki_v_hit1", "yuki_v_hit2", "yuki_v_hit3", "yuki_v_hit4", "yuki_v_hit5", "yuki_v_hit6", "yuki_v_hit7", "yuki_v_hit8", "yuki_v_hit9"],
};
const HP = 3;
const ARMOR = 2;
const BLAST_TURNS = 3;
const BOOM_SECONDS = 14; // ฉากระเบิดของ client (YukiBoom.jsx) 14 วิ — เข้า GAMEOVER พอดีตอนฉากจบ

const isYuki = (p) => !!p && p.characterId === ID && !p.summon;
function st(p) { return p.yuki || (p.yuki = { blast: null, greeted: false }); }
const blastOf = (p) => (isYuki(p) && p.alive ? st(p).blast : null);

// ครบเวลา: คลิปท่าไม้ตาย → (คลิปจบ) ทุกคน (รวมยูนิตที่ถูกเรียก/คนชั้นมิติอื่น/เพื่อนร่วมทีม) ตายแน่นอน + ฉากระเบิด → จบเกม
function detonate(engine, p) {
  st(p).blast = null;
  engine.queueCutscene(p, CUT.ult);
  engine.holdEndTurn(BOOM_SECONDS, () => {
    const at = p.pos ? { ...p.pos } : { x: 0, y: 0 };
    engine.log(`🚪 ${p.name} เกิดใหม่เป็นประตู — ระเบิดครั้งยิ่งใหญ่ กลืนทั้งแผนที่`);
    for (const t of Object.values(engine.players)) {
      if (t.id === p.id || !t.alive) continue;
      engine.instantDeath(t, "absolute");
      if (!t.alive) t.pos = null;
    }
    engine.declareWinner(p);
    engine.setYukiBoom({ by: p.id, x: at.x, y: at.y, size: p.boardSize || 1 });
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, MUSIC, VOICE, HP, ARMOR, BLAST_TURNS, BOOM_SECONDS,
  isYuki, blastOf,

  maxHp(p) { return isYuki(p) ? HP : undefined; },
  maxArmor(p, base) { return isYuki(p) ? ARMOR : base; },

  resetCombat(p) { if (isYuki(p)) p.yuki = { blast: null, greeted: false }; },

  // ---------- มิตรภาพ (combat.instantDeath — ถามแม้ force · ไม่ถามเมื่อ "absolute") ----------
  deathless(engine, p) {
    if (!isYuki(p)) return false;
    p.hp = HP;
    p.armor = ARMOR;
    engine.log(`🤝 ${p.name} มิตรภาพ — ฟื้นคืนชีพ (พลังชีวิต ${HP} · เกราะ ${ARMOR})`);
    engine.skillFlash({ name: "มิตรภาพ", img: IMG.base, by: p.name, color: engine.colorOf(p) });
    return true;
  },

  // ---------- ท่าไม้ตาย ----------
  canUseSkill(engine, p, tier) {
    if (!isYuki(p)) return true;
    return tier === "ultimate" && !st(p).blast;
  },
  endsTurn(engine, p, tier) { return isYuki(p) && tier === "ultimate"; },
  applyInstantSkill(engine, p, tier) {
    if (!isYuki(p) || tier !== "ultimate") return "";
    st(p).blast = { left: BLAST_TURNS, at: engine.severStamp() };
    engine.log(`🚪 ${p.name} เกิดใหม่เป็นประตู — ตั้งท่าระเบิดตัวเอง (อีก ${BLAST_TURNS} เทิร์น)`);
    return "";
  },

  // ระหว่างนับถอยหลัง: ยืนนิ่ง ข้ามตาเดินทั้งตา (action.nextActor)
  skipsTurn(engine, p) {
    const b = blastOf(p);
    if (!b) return false;
    engine.log(`🚪 ${p.name} ยืนนิ่ง — อีก ${b.left} เทิร์น`);
    return true;
  },

  // นับถอยหลังทุกยูกิ · ครบพร้อมกันหลายคน = คนที่กดก่อน (at น้อยสุด) ระเบิด ยูกิที่เหลือตายด้วย (ผู้ใช้ 2026-10-27)
  onEndTurn(engine) {
    const charging = Object.values(engine.players).filter((p) => blastOf(p)).sort((a, b) => st(a).blast.at - st(b).blast.at);
    for (const p of charging) st(p).blast.left--;
    const first = charging.find((p) => st(p).blast.left <= 0);
    if (first) detonate(engine, first);
  },

  // ตัดผลสกิล (server/sever.js — รากฐานจิตของเรียวกิ): เลิกนับถอยหลัง
  severables(engine, p) {
    const b = blastOf(p);
    if (!b) return [];
    return [{ key: "yukiGate", label: "เกิดใหม่เป็นประตู", at: b.at || 0, cancel() { st(p).blast = null; } }];
  },

  // ---------- เพลง / เสียงพากย์ ----------
  skillMusic(engine, p) {
    const b = blastOf(p);
    return b ? { music: MUSIC, at: b.at || 0 } : null;
  },
  // ตาเดินแรกของเกม = ประโยคเปิด (onActorReady เรียกหลังเสียงต้นตาเดินแล้ว)
  voiceLines(p) {
    if (!isYuki(p)) return null;
    return { turn: st(p).greeted ? [] : VOICE.start, struck: VOICE.struck };
  },
  onActorReady(engine, p) { if (isYuki(p)) st(p).greeted = true; },

  // ---------- ข้อมูลให้ client (players[].yuki) ----------
  yukiState(engine, p) {
    const b = blastOf(p);
    return b ? { left: b.left, at: b.at || 0 } : null;
  },
};

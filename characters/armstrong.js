// ============================================================
//  อาร์มสตรอง — id "armstrong" · กลาง · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.39 (2026-11-21)
//
//  ค่าพื้นฐาน: HP 10 / เกราะ 5 (ค่าฐานกลาง 7+3 / 3+2) · เดิน 4 · ตีประชิด [1, 1]
//  สกิลพื้นฐาน ขอสักหมัดเถอะ (3 แต้ม · เลือก 1 แบบ · คงอยู่ 2 เทิร์น · ทำงาน 1 ครั้ง · ค้างอยู่ = กดซ้ำไม่ได้):
//    สวนกลับ: ถูกคนอื่นทำให้เสียหาย (ไม่นับผลด่าน/สถานะผิดปกติ) → รับดาเมจตามปกติ แล้วพุ่งไปต่อยผู้โจมตี 3 (หลบได้ · เกราะก่อน) + ผลัก 5 ช่อง
//    สวนกลับช่วยเหลือ: ผู้เล่นคนอื่นในระยะ 4 (ระยะเดิน) ถูกโจมตี → กันการโจมตีนั้นทั้งก้อน แล้วพุ่งไปต่อย+ผลักแบบเดียวกัน
//      โหมดทีม = เพื่อนร่วมทีม · ตัวต่อตัว = ใครก็ได้ (แบบบัฟวงของโอเบรอน)
//    พุ่ง = ไปช่องว่างติดผู้โจมตีที่ใกล้อาร์มสตรองสุดแล้วยืนต่อ (ไม่มีช่อง = ต่อยจากที่เดิม) · ผลักชนของ = หยุดเฉยๆ
//  สกิลรอง NanoMachine ไง ไอ้ลูกชาย (0 แต้ม · เปิด/ปิด 1 ครั้งต่อเทิร์น · ไม่กินโควตา): เปิด = สกิลติดตัว Nanomachines
//    ต้นเทิร์นเสียแต้ม 1 (ไม่พอ = ปิดเอง) · พลังโจมตี +1 (ผู้ใช้ 2026-11-21) · เพลง theme · รูปร่างนาโน · คลิปครั้งแรกของเกม
//  ติดตัว Nanomachines (ระหว่างเปิด): เกราะ +2 ทุกต้นเทิร์น · เกราะเสีย 1 = ฟื้นพลังชีวิต 1 (ทุกทาง) · เกราะสูงสุด +5 · ปิด = ตัดเกราะเกินลง
//  ติดตัว 2 ยืนวัดกันบลูกผู้ชาย: นาโนเปิด + เกราะ ≥ 5 + ผู้เล่น (ไม่ใช่ยูนิต AI) ทำให้เสียหาย →
//    ดาเมจทั้งการกระทำถูกพักไว้ → คลิปเริ่มต่อย → ผู้โจมตีกดรัว 5 วิ (Space/คลิก) ระหว่างคลิปกำลังต่อย ·
//    10 ครั้ง = +1 (เพดาน = เกราะตอนนั้น) → ดาเมจลง → คลิป "ต่อยเข้า" (ทะลุเข้าพลังชีวิต) / "ต่อยไม่เข้า"
//  ติดตัว 3 ขอทำลายปอดแปบ: ปุ่ม HUD (แบบ Orca Echo) แต้มสกิล +2 ทันที (คูลดาวน์ 2 เทิร์น) · คลิปทุกครั้ง
//  ท่าไม้ตาย ไปคุยกับรากมะม่วง (6 แต้ม · คูลดาวน์ 3 · ประชิด · หลบได้): คลิปนั่งค่อม → กดรัว 10 วิ → 10 ครั้ง = 1 (สูงสุด 10) → คลิปปิดท้าย → ดาเมจ (เกราะก่อน)
//
//  ฉากต่อเนื่องทั้งหมดผ่าน engine.deferAfterCutscene + wantFlow (ต้นแบบ Finisher ของแม็กน่า) · คลิปไม่มี SFX ซ้อน (กฎผู้ใช้ 2026-11-03)
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");
const boxOf = (u) => require("../server/phases/action").boxOf(u);
const matchOf = () => require("../server/match");

const ID = "armstrong";
const DIR = "/characters/armstrong";
const IMG = {
  base: `${DIR}/armstrong.webp`,
  nano: `${DIR}/nano.webp`,
  basic: `${DIR}/skill1.webp`,
  secondary: `${DIR}/skill2.webp`,
  ult: `${DIR}/skill3.webp`,
  smoke: `${DIR}/smoke.webp`,
};
const VIDEO = {
  counterRun: `${DIR}/counter_run.webm`, counter: `${DIR}/counter.mp4`, nano: `${DIR}/nano.mp4`, smoke: `${DIR}/smoke.mp4`,
  ultStart: `${DIR}/ult_start.mp4`, ultMash: `${DIR}/ult_mash.mp4`, ultEnd: `${DIR}/ult_end.mp4`,
  guardStart: `${DIR}/guard_start.mp4`, guardMash: `${DIR}/guard_mash.mp4`, guardHit: `${DIR}/guard_hit.mp4`, guardBlock: `${DIR}/guard_block.mp4`,
};
const CUT = {
  counterRun: "armCounterRun", counter: "armCounter", nano: "armNano", smoke: "armSmoke",
  ultStart: "armUltStart", ultMash: "armUltMash", ultEnd: "armUltEnd",
  guardStart: "armGuardStart", guardMash: "armGuardMash", guardHit: "armGuardHit", guardBlock: "armGuardBlock",
};
// วินาทีของฉาก (คลิปที่มีการ์ดเปิดตัว +1 · noIntro = ความยาวคลิป) · พุ่งไปต่อย/บุหรี่/ฉากป้องกัน = ไม่ขึ้นชื่อ ไม่มีการ์ดเปิดตัว (ผู้ใช้ 2026-11-21)
const CLIP_SEC = {
  counterRun: 1.15, counter: 8.9, nano: 12.5, smoke: 4.3,
  ultStart: 4.0, ultMash: 12.0, ultEnd: 7.6,
  guardStart: 7.2, guardMash: 5.5, guardHit: 5.0, guardBlock: 7.5,
};
const MUSIC = "armstrong_nano";
// เสียงหมัด (ไฟล์ในเครื่องของโจรุโน่ — ไม่ได้ดาวน์โหลดใหม่): ตีปกติ · หมัดสวนกลับตอนลง (หลังคลิปจบ = ไม่ซ้อนวีดีโอ)
const SFX = { punch: "gio_punch", heavy: "gio_punch2" };
const NAME = {
  basic: "ขอสักหมัดเถอะ", self: "สวนกลับ", ally: "สวนกลับช่วยเหลือ",
  secondary: "NanoMachine ไง ไอ้ลูกชาย", nano: "Nanomachines", guard: "ยืนวัดกันบลูกผู้ชาย",
  smoke: "ขอทำลายปอดแปบ", ult: "ไปคุยกับรากมะม่วง",
};
const COUNTER = { cost: 3, dmg: 3, push: 5, turns: 2, reach: 4 };
const NANO = { upkeep: 1, armorRegen: 2, armorMax: 5, atk: 1 };
const GUARD = { minArmor: 5, per: 10, ms: 5000 };
const ULT = { cost: 6, cd: 3, per: 10, max: 10, ms: 10000 };
const SMOKE = { sp: 2, cd: 2 };
const DASH_PAUSE = 0.45;

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const passiveOn = (p) => PassiveSeal.on(p);
function fresh() {
  return {
    nano: false, nanoAt: 0, nanoSever: 0, toggleRound: -1,
    stance: null, // { mode: "self" | "ally", until, at }
    guardCmd: null, // { seq, by, ally } — กันทั้งก้อนต่อในการกระทำเดียวกัน
    hold: null, // { srcId, seq, mixed, direct, armor, normal } — ดาเมจที่พักไว้รอ QTE
    counterQ: null, // { by, mode, ally }
    flowQueued: false, landing: false,
    qte: null, // { kind: "guard" | "ult", by, on, count, cap, until, ms, seq }
    ultReady: 0, smokeReady: 0,
  };
}
function st(p) { return p.armstrong || (p.armstrong = fresh()); }
const nanoOn = (p) => isMe(p) && st(p).nano;
let QSEQ = 0;

// ผู้ลงมือที่เป็นศัตรูในตาเดินของใครสักคน (ไม่ใช่ผลด่าน/สถานะ/ตัวเอง/เพื่อน)
function inTurn() {
  const m = matchOf();
  return !!m.actorId && ["ACTION", "ATTACKING", "CUTSCENE"].includes(m.gameState);
}
function hostileSrc(engine, p) {
  if (!p || p._statusDamage || !inTurn()) return null;
  const src = engine.effectSourceId && engine.players[engine.effectSourceId];
  if (!src || src.id === p.id || engine.sameTeam(src, p)) return null;
  return src;
}
// คนที่ผลัดกดรัวได้ = ผู้เล่นจริง (ยูนิต AI / มอน = ไม่มี QTE ดาเมจลงปกติ)
const humanSrc = (u) => !!u && !u.summon;
const qteSafe = () => { const m = matchOf(); return !m.timeFreeze && !m.clockUp; };

// ---------- ฉากต่อเนื่อง ----------
function queueFlow(engine, p) {
  const s = st(p);
  if (s.flowQueued) return;
  s.flowQueued = true;
  engine.deferAfterCutscene(() => settle(engine, p));
  engine.wantFlow();
}
// ทำทีละเรื่อง: รอจังหวะของสกิลผู้โจมตีให้จบก่อน → QTE ดาเมจที่พักไว้ → สวนกลับ
function settle(engine, p) {
  const s = st(p);
  if (matchOf().skillBeats.length) { engine.skillBeat(0.05, () => settle(engine, p)); return; }
  if (s.hold) { startGuard(engine, p); return; }
  if (s.counterQ) { startCounter(engine, p); return; }
  s.flowQueued = false;
}

// ---------- ยืนวัดกันบลูกผู้ชาย ----------
function startGuard(engine, p) {
  const s = st(p), h = s.hold, src = h && engine.players[h.srcId];
  if (!p.alive || !src || !src.alive) { landGuard(engine, p, 0, false); settle(engine, p); return; }
  engine.queueCutscene(p, CUT.guardStart);
  engine.deferAfterCutscene(() => {
    if (!p.alive) { s.hold = null; settle(engine, p); return; }
    s.qte = { kind: "guard", by: src.id, on: p.id, count: 0, cap: Math.max(0, p.armor | 0), until: Date.now() + GUARD.ms, ms: GUARD.ms, seq: ++QSEQ };
    engine.queueCutscene(p, CUT.guardMash);
    engine.deferAfterCutscene(() => {
      const q = s.qte;
      s.qte = null;
      const bonus = q ? Math.min(q.cap, Math.floor(q.count / GUARD.per)) : 0;
      const hit = landGuard(engine, p, bonus, true, q ? q.count : 0);
      engine.queueCutscene(p, hit ? CUT.guardHit : CUT.guardBlock);
      engine.deferAfterCutscene(() => settle(engine, p));
    });
  });
}
// ลงดาเมจที่พักไว้ (+ โบนัสจาก QTE) → true = ทะลุเกราะเข้าพลังชีวิต
function landGuard(engine, p, bonus, withQte, count = 0) {
  const s = st(p), h = s.hold;
  s.hold = null;
  if (!h || !p.alive) return false;
  const src = engine.players[h.srcId] || null;
  s.lossAll = 0; s.lossArmor = 0;
  s.landing = true;
  try {
    engine.withEffectSource(src, () => {
      if (h.direct > 0) engine.dealDirect(p, h.direct, h.normal);
      if (h.armor > 0) engine.dealArmorOnly(p, h.armor, h.normal);
      const m = h.mixed + bonus;
      if (m > 0) engine.dealMixed(p, m, h.normal);
      if (p.alive && p.hp <= 0) engine.instantDeath(p);
    });
  } finally { s.landing = false; }
  if (!p.alive) p.pos = null;
  const hit = !p.alive || s.lossAll > s.lossArmor; // เสียพลังชีวิต/เลือดชั่วคราวจริง (ไม่ใช่แค่เกราะ)
  const total = h.direct + h.armor + h.mixed + bonus;
  if (withQte) engine.log(`👊 ${src ? src.name : "?"} ${NAME.guard} — กด ${count} ครั้ง +${bonus} · รวม ${total}${hit ? " · ทะลุเกราะ!" : " · ไม่เข้า"}`);
  return hit;
}

// ---------- ขอสักหมัดเถอะ ----------
function startCounter(engine, p) {
  const s = st(p), c = s.counterQ;
  s.counterQ = null;
  const t = c && engine.players[c.by];
  if (!p.alive || !p.pos || !t || !t.alive || !t.pos) { settle(engine, p); return; }
  // ท่อนวิ่ง (พื้นฟ้าตัดออก — webm alpha ซ้อนบนกระดาน · ผู้ใช้ 2026-11-21) → ท่อนต่อยเต็มจอ
  engine.queueCutscene(p, CUT.counterRun);
  engine.queueCutscene(p, CUT.counter);
  engine.deferAfterCutscene(() => engine.withEffectSource(p, () => landCounter(engine, p, t)));
}
// ช่องว่างติดผู้โจมตีที่ใกล้อาร์มสตรองสุด (ติดอยู่แล้ว = ไม่ขยับ)
function dashSpot(engine, p, t) {
  if (Board.dist(boxOf(p), boxOf(t)) <= 1) return null;
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: Board.wx ? Board.wx(t.pos.x + dx) : t.pos.x + dx, y: t.pos.y + dy }))
    .filter((c) => engine.tileFree(c.x, c.y, p.id));
  const far = (c) => Math.abs(Board.wdx ? Board.wdx(p.pos.x, c.x) : c.x - p.pos.x) + Math.abs(c.y - p.pos.y);
  opts.sort((a, b) => far(a) - far(b));
  return opts[0] || null;
}
function landCounter(engine, p, t) {
  if (!p.alive || !p.pos || !t.alive || !t.pos) { settle(engine, p); return; }
  const to = dashSpot(engine, p, t);
  if (to) {
    const from = { ...p.pos };
    p.pos = { ...to };
    engine.setDash({ id: p.id, path: [from, { ...to }] });
    engine.skillBeat(DASH_PAUSE, () => engine.withEffectSource(p, () => { punch(engine, p, t); settle(engine, p); }));
    return;
  }
  punch(engine, p, t);
  settle(engine, p);
}
function punch(engine, p, t) {
  if (!p.alive || !t.alive || !t.pos) return;
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, NAME.basic)) return;
  const block = engine.attackBlocked(t, p);
  if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${NAME.basic}ของ ${p.name}`); return; }
  engine.sfx(SFX.heavy);
  engine.dealMixed(t, COUNTER.dmg, false);
  engine.log(`👊 ${p.name} ${NAME.basic} → ${t.name} -${COUNTER.dmg} (ลดเกราะก่อน)`);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) { t.pos = null; return; }
  if (!p.pos || Board.dist(boxOf(p), boxOf(t)) > 1) return;
  const dx = Math.sign(Board.wdx ? Board.wdx(p.pos.x, t.pos.x) : t.pos.x - p.pos.x), dy = Math.sign(t.pos.y - p.pos.y);
  if (!dx && !dy) return;
  const ctx = engine.ice.begin();
  engine.ice.pushUnit(t, dx ? { x: dx, y: 0 } : { x: 0, y: dy }, ctx, COUNTER.push);
  engine.ice.flush(ctx);
}
// อาร์มสตรองคนนี้คุ้มกัน u ได้ไหม (ระยะเดิน 4 · ทีม = เพื่อน · ตัวต่อตัว = ใครก็ได้)
function protects(engine, q, u, attacker) {
  if (!q.alive || !q.pos || !u || !u.alive || !u.pos || u.id === q.id || attacker.id === q.id) return false;
  if (u.summon && !u.summon.controlled) return false;
  if (engine.sameTeam(attacker, q)) return false;
  if (engine.teamModeActive() && !engine.isAlly(q, u)) return false;
  return Board.dist(boxOf(q), boxOf(u)) <= COUNTER.reach;
}

// ---------- ไปคุยกับรากมะม่วง ----------
function castUlt(engine, p, t) {
  const s = st(p);
  s.ultReady = round() + ULT.cd;
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, NAME.ult)) return " — หลบได้";
  engine.queueCutscene(p, CUT.ultStart);
  engine.deferAfterCutscene(() => {
    if (!p.alive) return;
    s.qte = { kind: "ult", by: p.id, on: t.id, count: 0, cap: ULT.max, until: Date.now() + ULT.ms, ms: ULT.ms, seq: ++QSEQ };
    engine.queueCutscene(p, CUT.ultMash);
    engine.deferAfterCutscene(() => {
      const q = s.qte;
      s.qte = null;
      const count = q ? q.count : 0;
      const dmg = Math.min(ULT.max, Math.floor(count / ULT.per));
      engine.queueCutscene(p, CUT.ultEnd);
      engine.deferAfterCutscene(() => engine.withEffectSource(p, () => landUlt(engine, p, t, dmg, count)));
    });
  });
  return "";
}
function landUlt(engine, p, t, dmg, count) {
  if (!t.alive || !t.pos) return;
  const block = engine.attackBlocked(t, p);
  if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${NAME.ult}ของ ${p.name}`); return; }
  engine.boardFx("armFx", { kind: "boom", at: { ...t.pos }, size: engine.sizeOf(t) }); // ระเบิดปิดจบ (ผู้ใช้ 2026-11-21 — เหมือนในคลิป)
  if (dmg > 0) engine.dealMixed(t, dmg, false);
  engine.log(`👊 ${p.name} ${NAME.ult} → ${t.name} กด ${count} ครั้ง -${dmg} (ลดเกราะก่อน)`);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) t.pos = null;
}

// ---------- นาโน ----------
function setNano(engine, p, on, why) {
  const s = st(p);
  if (s.nano === on) return;
  s.nano = on;
  if (on) {
    s.nanoAt = engine.nextTransformCounter();
    s.nanoSever = engine.severStamp();
    engine.triggerCutscene(p, CUT.nano); // คลิปครั้งแรกของเกม · ครั้งต่อไปการ์ดแจ้งเตือน
    engine.log(`🧬 ${p.name} ${NAME.nano} — เปิด`);
    return;
  }
  p.armor = Math.min(p.armor, engine.maxArmorOf(p));
  engine.log(`🧬 ${p.name} ${NAME.nano} — ปิด${why ? ` (${why})` : ""}`);
}

const BASIC_CHOICES = [
  { key: "self", name: NAME.self, desc: `2 เทิร์น · ทำงาน 1 ครั้ง · ถูกผู้อื่นทำให้เสียหาย (ไม่นับผลด่าน/สถานะผิดปกติ) = ยังรับความเสียหาย แล้วพุ่งไปต่อยผู้โจมตี ${COUNTER.dmg} (หลบได้ · ลดเกราะก่อน) ผลักออก ${COUNTER.push} ช่อง` },
  { key: "ally", name: NAME.ally, desc: `2 เทิร์น · ทำงาน 1 ครั้ง · ผู้เล่นอื่นในระยะ ${COUNTER.reach} ถูกโจมตี = กันการโจมตีนั้นทั้งหมด แล้วพุ่งไปต่อยผู้โจมตี ${COUNTER.dmg} (หลบได้ · ลดเกราะก่อน) ผลักออก ${COUNTER.push} ช่อง` },
];

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, CLIP_SEC, NAME, MUSIC, SFX, COUNTER, NANO, GUARD, ULT, SMOKE,
  isMe, nanoOn,

  resetCombat(p) {
    p.armstrong = isMe(p) ? fresh() : null;
  },

  // ---------- Nanomachines ----------
  maxArmor(p, base) {
    return nanoOn(p) && passiveOn(p) ? base + NANO.armorMax : base;
  },
  damageBonus(engine, attacker) { return nanoOn(attacker) ? NANO.atk : 0; },
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive || !st(p).nano) return;
    if ((p.skillPoints || 0) < NANO.upkeep) { setNano(engine, p, false, "แต้มสกิลไม่พอ"); return; }
    p.skillPoints -= NANO.upkeep;
    if (!passiveOn(p)) return;
    const got = engine.healArmor(p, NANO.armorRegen);
    if (got > 0) engine.log(`🧬 ${p.name} ${NAME.nano} — เกราะ +${got}`);
  },
  // นับการเสียระหว่างลงดาเมจที่พักไว้ (landGuard) — แยก "ต่อยเข้า" (ทะลุเกราะ) กับ "ไม่เข้า"
  onDamageTaken(engine, p, n) { if (isMe(p) && st(p).landing) st(p).lossAll += n || 1; },
  onArmorLost(engine, p) {
    if (isMe(p) && st(p).landing) st(p).lossArmor += 1;
    if (!nanoOn(p) || !p.alive || !passiveOn(p)) return;
    engine.healHp(p, 1);
  },
  displayImg(p) { return nanoOn(p) ? IMG.nano : undefined; },
  skillMusic(engine, p) {
    if (!nanoOn(p) || !p.alive) return null;
    return { music: MUSIC, at: st(p).nanoAt || 0 };
  },

  // ---------- ดาเมจเข้า: สวนกลับ (ตัวเอง) + ยืนวัดกันบลูกผู้ชาย ----------
  adjustIncomingDamage(engine, p, n, isNormalAttack, kind) {
    if (!isMe(p) || !(n > 0) || !p.alive) return n;
    const s = st(p);
    if (s.landing) return n;
    const src = hostileSrc(engine, p);
    if (!src) return n;
    if (s.stance && s.stance.mode === "self" && !s.counterQ) {
      s.counterQ = { by: src.id, mode: "self" };
      s.stance = null;
      queueFlow(engine, p);
      engine.log(`👊 ${p.name} ${NAME.self} — เตรียมสวน ${src.name}`);
    }
    const same = s.hold && s.hold.seq === engine.cmdSeq && s.hold.srcId === src.id;
    const start = !s.hold && s.nano && passiveOn(p) && humanSrc(src) && qteSafe() && (p.armor | 0) >= GUARD.minArmor;
    if (!same && !start) return n;
    if (start) s.hold = { srcId: src.id, seq: engine.cmdSeq, mixed: 0, direct: 0, armor: 0, normal: !!isNormalAttack };
    const k = kind === "direct" ? "direct" : kind === "armor" ? "armor" : "mixed";
    s.hold[k] += n;
    queueFlow(engine, p);
    return 0;
  },
  // สวนกลับช่วยเหลือ: กันการโจมตีใส่คนในระยะทั้งก้อน (ฮุค broadcast — combat.attackBlocked)
  shieldsFrom(engine, u, attacker) {
    if (!attacker || !u || u._statusDamage || !inTurn()) return null;
    for (const q of Object.values(engine.players)) {
      if (!isMe(q)) continue;
      const s = st(q);
      if (s.guardCmd && s.guardCmd.seq === engine.cmdSeq && s.guardCmd.by === attacker.id && s.guardCmd.ally === u.id) {
        return { name: NAME.ally, img: IMG.basic };
      }
      if (!s.stance || s.stance.mode !== "ally" || !protects(engine, q, u, attacker)) continue;
      s.stance = null;
      s.guardCmd = { seq: engine.cmdSeq, by: attacker.id, ally: u.id };
      s.counterQ = { by: attacker.id, mode: "ally", ally: u.id };
      queueFlow(engine, q);
      engine.log(`👊 ${q.name} ${NAME.ally} — ขวางการโจมตีของ ${attacker.name} ที่มีต่อ ${u.name}`);
      return { name: NAME.ally, img: IMG.basic };
    }
    return null;
  },

  // ---------- กดรัว (socket armMash) ----------
  mash(engine, id, unitId) {
    for (const q of Object.values(engine.players)) {
      const s = isMe(q) && q.armstrong;
      const w = s && s.qte;
      if (!w || Date.now() > w.until) continue;
      if (w.by !== id && w.by !== unitId) continue;
      w.count += 1;
      return true;
    }
    return false;
  },
  qteView(engine) {
    const now = Date.now();
    for (const q of Object.values(engine.players)) {
      const w = isMe(q) && q.armstrong && q.armstrong.qte;
      if (!w) continue;
      return { seq: w.seq, kind: w.kind, by: w.by, on: w.on, owner: q.id, cap: w.cap, per: w.kind === "ult" ? ULT.per : GUARD.per, ms: w.ms, left: Math.max(0, w.until - now) };
    }
    return null;
  },
  activeQte(p) { return !!(isMe(p) && p.armstrong && p.armstrong.qte); },

  // ---------- ขอทำลายปอดแปบ (ปุ่ม HUD) ----------
  hudActions(engine, p) {
    if (!isMe(p) || !p.alive || !passiveOn(p)) return undefined;
    const cd = cdLeft(st(p).smokeReady, engine.roundNumber);
    return [{ key: "armSmoke", icon: "🚬", name: NAME.smoke, img: IMG.smoke, cd, disabled: cd > 0 || !engine.canAct(p) }];
  },
  charAction(engine, p, key) {
    if (!isMe(p) || key !== "armSmoke" || !engine.canAct(p) || !passiveOn(p)) return;
    const s = st(p), r = engine.roundNumber;
    if (cdLeft(s.smokeReady, r) > 0) return;
    s.smokeReady = r + SMOKE.cd;
    const before = p.skillPoints || 0;
    engine.addSkill(p, SMOKE.sp, "passive");
    engine.log(`🚬 ${p.name} ${NAME.smoke} — แต้มสกิล +${(p.skillPoints || 0) - before}`);
    engine.queueCutscene(p, CUT.smoke);
    engine.pausePlayingForCutscene();
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    const s = st(p);
    if (tier === "basic") {
      return { choices: BASIC_CHOICES.map((c) => ({ ...c, img: IMG.basic, cost: COUNTER.cost, area: { kind: "self" }, locked: !!s.stance })) };
    }
    if (tier === "secondary") return s.nano ? { img: IMG.nano, active: true } : null;
    return null;
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber, ult = cdLeft(s.ultReady, r);
    return {
      basic: { cd: 0, locked: !!s.stance },
      secondary: { cd: 0, locked: s.toggleRound === r },
      ultimate: { cd: ult, locked: ult > 0 },
    };
  },
  skipsTurnQuota(p, tier) { return isMe(p) && tier === "secondary"; },
  ignoresTurnQuota(p, tier) { return isMe(p) && tier === "secondary"; },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") return !s.stance && (opts.form === "self" || opts.form === "ally");
    if (tier === "secondary") return s.toggleRound !== r;
    if (tier === "ultimate") {
      if (cdLeft(s.ultReady, r) > 0) return false;
      const t = engine.players[(targets || [])[0]];
      return !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
    }
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      const mode = opts.form === "ally" ? "ally" : "self";
      s.stance = { mode, until: r + COUNTER.turns, at: engine.severStamp() };
      engine.log(`👊 ${p.name} ${NAME.basic} — ${mode === "ally" ? NAME.ally : NAME.self} (${COUNTER.turns} เทิร์น)`);
      return ` — ${mode === "ally" ? NAME.ally : NAME.self}`;
    }
    if (tier === "secondary") {
      s.toggleRound = r;
      setNano(engine, p, !s.nano);
      return s.nano ? "" : " — ปิด";
    }
    if (tier === "ultimate") return castUlt(engine, p, engine.players[targets[0]]);
    return "";
  },
  // ท่าไม้ตาย/เปิดนาโนมีคลิป = ไม่มีป้ายเสียงตัดหน้า (กฎผู้ใช้ 2026-11-03)
  skillSound() { return null; },
  attackSound(p) { return isMe(p) ? SFX.punch : undefined; },

  // ---------- จังหวะเทิร์น ----------
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p)) continue;
      const s = st(p);
      if (s.stance && engine.roundNumber >= s.stance.until - 1) {
        engine.log(`👊 ${p.name} ${NAME.basic} — หมดเวลา`);
        s.stance = null;
      }
      s.guardCmd = null;
    }
  },
  onDeath(engine, dead) {
    if (!isMe(dead)) return;
    const s = st(dead);
    s.stance = null; s.counterQ = null; s.qte = null;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.stance) out.push({ key: "stance", label: NAME.basic, at: s.stance.at, cancel: () => { s.stance = null; } });
    if (s.nano) out.push({ key: "nano", label: NAME.nano, at: s.nanoSever, cancel: () => setNano(engine, p, false) });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  armstrongState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      nano: s.nano,
      stance: s.stance ? { mode: s.stance.mode, left: Math.max(1, s.stance.until - r) } : null,
      smoke: cdLeft(s.smokeReady, r),
    };
  },
  // Road Trip: การต่อสู้จบกลางคัน
  cancelFlow(p) {
    if (!isMe(p)) return;
    const s = st(p);
    s.hold = null; s.counterQ = null; s.qte = null; s.flowQueued = false; s.landing = false;
  },
};

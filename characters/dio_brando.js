// ============================================================
//  ดิโอ บรันโด (JoJo Part 3 Stardust Crusaders · สแตนด์ THE WORLD) — ระดับกลาง · unique · id "dio_brando"
//  กติกาทั้งหมดผู้ใช้ตัดสิน 2026-11-05 — GRID_PLAN.md §7.26 (แหล่งความจริง)
//
//  พลังชีวิต 9 · เกราะ 0 · เดิน 4 · ตีปกติ [1, 2] · พลังโจมตี 1
//  Time Meter 0/6 (BloodStack 6 ขึ้นไป = 0/8): ตีปกติ +1 · ใช้สกิล +1 · เริ่มเทิร์นเป็นคนแรก +2 (ระหว่างหยุดเวลาไม่ได้)
//  Vampire (ติดตัว): ตี/สกิลโดนศัตรู 1 คน = BloodStack +1 + ดูดเลือด 1 (ดิโอ +1 · ไม่มีดาเมจเพิ่ม)
//    มีดไม่ได้ BloodStack (ยังดูดเลือด — เนิฟผู้ใช้ 2026-11-08)
//    BloodStack 6 ขึ้นไป: Time Meter จุ 8 · คูลดาวน์ Za warudo 3 · Za warudo ทำงานทันที · คลิปครั้งเดียว
//    BloodStack 4 ขึ้นไป: ดูดเลือด +1 · BloodStack 8 ขึ้นไป: ดาเมจสกิลทุกท่า +1 (ผู้ใช้ปรับ 2026-11-07)
//    กลางวันโดนดาเมจ +1 · กลางคืนต้านดาเมจ 1 · ไม่ใช้กับดาเมจต่อเทิร์น (DoT ต้นเทิร์น — engine.dotTick)
//    ถูกตี/ถูกสกิลถึงตาย = Last Stand กับผู้โจมตี (ครั้งเดียว): จั่ว/พอ เป้า 21 · แพ้ = ตาย · ชนะ (รวมเสมอ/แตกทั้งคู่) = ดูดเลือด 2
//  Throwing knife (2 · คูลดาวน์ 3): 1 คนในแนวตรง 4 ทิศ ระยะ 4 · 1 + เลือดไหล 1 · ไม่ทะลุสิ่งกีดขวาง
//  Stand (3): SHINEI! 2 ทะลุเกราะ + ไร้เยียวยา 2 · MUDAMUDAMUDA! 3 + ผุพัง 2 · แนว 2×1 · แบบละคูลดาวน์ 2
//  Za warudo!!!!!! (Time Meter ทั้งหมด = จำนวน Action · คูลดาวน์ 4): ปกติทำงานต้นเทิร์นถัดไป ·
//    กดตอนตาคนอื่นได้ (แทรกตา — เสียเพิ่ม 1 · รวมตอนคนอื่นหยุดเวลา แล้วคืนตาเขา)
//  ร่างหยุดเวลา (ตาพิเศษ): มีด 1 Action (2 ครั้งต่อการหยุดเวลา) · Stand 3 Action · ตีปกติ 1 Action (ไม่จบตา) · เดินฟรี ·
//    Road Roller 3 Action (เนิฟผู้ใช้ 2026-11-08 — เดิม มีด/Stand 1 · Road Roller 2 · มีดไม่จำกัด)
//    ดาเมจลงพร้อมกันตอนเวลาเดินต่อ (ทอยหลบตอนกด) · Action หมด = เวลาเดินต่อ
//  Road Roller: 1 คนในกรอบ 5×5 · ลอยออก → คลิป → รถตกพร้อมดิโอ → ต่อยรถรัวจนระเบิด · 3 · ดิโอลงข้างเป้า · เวลาเดินต่อทันที
//
//  ทุกอย่างเก็บที่ p.dio · เอฟเฟกต์: engine.boardFx("dioFx", { kind, id, color, … }) — client/src/board/dioFx.js
// ============================================================
const Board = require("../server/board");

const ID = "dio_brando";
const DIR = "/characters/dio_brando";
const IMG = {
  base: `${DIR}/dio_cover.webp`, stand: `${DIR}/dio_stand.webp`, world: `${DIR}/dio_timestop.jpg`, knife: `${DIR}/dio_knife.jpg`,
  shine: `${DIR}/dio_shine.jpg`, muda: `${DIR}/dio_muda.png`, roller: `${DIR}/dio_roadroller.jpg`,
};
const VIDEO = {
  blood6: `${DIR}/dio_blood6.mp4`, last: `${DIR}/dio_laststand.mp4`,
  lastFail: `${DIR}/dio_laststand_fail.mp4`, roller: `${DIR}/dio_roadroller.mp4`,
};
const CUT = { blood6: "dioBlood6", last: "dioLastStand", lastFail: "dioLastStandFail", roller: "dioRoadRoller" };
const SFX = {
  start: "dio_start", attack: "dio_attack", hit: "dio_hit", knife: "dio_knife", shine: "dio_shine", muda: "dio_muda",
  world: "dio_world", stop: "dio_stop", resume: "dio_resume", explode: "diego_explode",
};

const HP = 9;
const ARMOR = 0;
const MOV = 4;
const RANGE = [1, 2];
const METER = { max: 6, surge: 8, first: 2 };
const BLOOD = { max: 10, thirst: 4, surge: 6, frenzy: 8 };
const KNIFE = { cost: 2, cd: 3, len: 4, dmg: 1, bleed: 1, stopUses: 2 }; // stopUses = ครั้งต่อการหยุดเวลา 1 ครั้ง
const STAND_COST = 3;
const STAND_ACTIONS = 3; // ร่างหยุดเวลา
const STAND = {
  shine: { name: "SHINEI!", img: IMG.shine, dmg: 2, pierce: true, status: "nohealing", turns: 2, cd: 2, sfx: SFX.shine },
  muda: { name: "MUDAMUDAMUDA!", img: IMG.muda, dmg: 3, pierce: false, status: "decay", turns: 2, cd: 2, sfx: SFX.muda },
};
const STAND_LEN = 2;
const WORLD = { cd: 4, cdSurge: 3, tax: 1 };
const ROLLER = { actions: 3, dmg: 3, reach: 2 };
const LAST = { win: 2, seconds: 30, botStop: 17, target: 21 };
// จังหวะเอฟเฟกต์ (วินาที) — ต้องตรงกับ DIO_FX ใน client/src/board/dioFx.js
const FX = { knife: 0.55, shine: 0.95, muda: 2.4, press: 1.1, stop: 2.5, resume: 2.2, lift: 0.9, slam: 0.5, rush: 2.5, boom: 1.5, result: 3.6 };

const K = Board.key;
const LINE_AREA = { kind: "line", len: STAND_LEN, width: 1, hostile: true };
const ROLLER_CELLS = [];
for (let dx = -ROLLER.reach; dx <= ROLLER.reach; dx++) for (let dy = -ROLLER.reach; dy <= ROLLER.reach; dy++) if (dx || dy) ROLLER_CELLS.push([dx, dy]);
const ROLLER_SKILL = {
  name: "Road Roller", img: IMG.roller, cost: 0, costLabel: `${ROLLER.actions} Action`,
  area: { kind: "target", range: ROLLER.reach, cells: ROLLER_CELLS },
  desc: `1 คนในกรอบ 5×5 รอบตัว: ลอยออกจากกระดาน ทับด้วยรถบดถนน ความเสียหาย ${ROLLER.dmg} แล้วลงข้างเป้า · เวลาเดินต่อทันที`,
};
const STAND_DESC = {
  shine: `เลือกทิศ แนว ${STAND_LEN}×1: ความเสียหาย ${STAND.shine.dmg} ทะลุเกราะ + ไร้เยียวยา ${STAND.shine.turns} เทิร์น (คูลดาวน์ ${STAND.shine.cd} เทิร์น)`,
  muda: `เลือกทิศ แนว ${STAND_LEN}×1: ความเสียหาย ${STAND.muda.dmg} + ผุพัง ${STAND.muda.turns} เทิร์น (คูลดาวน์ ${STAND.muda.cd} เทิร์น)`,
};

const isDio = (p) => !!p && p.characterId === ID && !p.summon;
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const foe = (engine, p, t) => !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
function fresh() {
  return {
    meter: 0, blood: 0,
    knifeReady: 0, shineReady: 0, mudaReady: 0, worldReady: 0, worldSever: 0,
    pending: 0, pendingRound: 0, // Action ที่รอเริ่มหยุดเวลา (ต้นเทิร์นถัดไป / ตาที่แทรก)
    stopping: false, actions: 0, knives: 0, savedQuota: false, deniedAt: null, // knives = มีดที่ปาในการหยุดเวลาครั้งนี้
    lastUsed: false, duelPending: false, duelFoe: null, duel: null,
    clip6: false, want6: false, startVoice: false,
  };
}
function st(p) { return p.dio || (p.dio = fresh()); }
function fx(engine, p, kind, data) {
  engine.boardFx("dioFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}
const stopping = (p) => isDio(p) && !!st(p).stopping;
const meterMax = (s) => (s.blood >= BLOOD.surge ? METER.surge : METER.max);
const worldCd = (s) => (s.blood >= BLOOD.surge ? WORLD.cdSurge : WORLD.cd);
const skillBonus = (s) => (s.blood >= BLOOD.frenzy ? 1 : 0);
const drainOf = (s) => 1 + (s.blood >= BLOOD.thirst ? 1 : 0);
function addMeter(p, n) {
  const s = st(p);
  if (s.stopping) return;
  s.meter = Math.min(meterMax(s), s.meter + n);
}
// ตายตอนผลลง: ระหว่างหยุดเวลา instantDeath ค้างไว้เอง (ตกรอบตอนเวลาเดินต่อ)
function settle(engine, t) {
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
}
// Vampire: โดนศัตรู 1 คน = ดูดเลือด (ดิโอ +n · ไม่มีดาเมจเพิ่มจากการตี/สกิลนั้น — ผู้ใช้แก้ 2026-11-05) + BloodStack +1
//  stack: false = ดูดเลือดอย่างเดียว ไม่ได้ BloodStack (มีด)
function drain(engine, p, t, at, { stack = true } = {}) {
  const s = st(p);
  const n = drainOf(s);
  const healed = engine.healHp(p, n);
  if (stack) s.blood = Math.min(BLOOD.max, s.blood + 1);
  if (stack && s.blood >= BLOOD.surge && !s.clip6) { s.clip6 = true; s.want6 = true; }
  fx(engine, p, "drain", { targetId: t.id, from: at || (t.pos ? { ...t.pos } : null), healed, blood: s.blood });
}
// ดาเมจสกิลของดิโอ 1 เป้า: ทอยหลบ (แม่นยำเจาะ) · กันทั้งก้อนได้ · BloodStack 8 +1 · เปราะบางบวก → ดูดเลือด
function standHit(engine, p, t, name, base, pierce, { stack = true } = {}) {
  t.wasAttacked = true;
  const at = t.pos ? { ...t.pos } : null;
  if (engine.skillDodge(p, t, name)) return { dodge: true };
  const block = engine.attackBlocked(t, p);
  if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${name}ของ ${p.name}`); return { blocked: true }; }
  const n = base + skillBonus(st(p)) + engine.statusAmtOf(t, "fragile");
  if (pierce) engine.dealDirect(t, n);
  else engine.dealMixed(t, n, false);
  engine.log(`${p.name} ${name} → ${t.name} -${n}${pierce ? " (ทะลุเกราะ)" : ""}`);
  settle(engine, t);
  drain(engine, p, t, at, { stack });
  return { dmg: n };
}
// คลิป BloodStack 6: เล่นหลังเอฟเฟกต์/เสียงของท่านี้จบ (กฎผู้ใช้ 2026-11-03 — ไม่ซ้อนวีดีโอ)
function playSurge(engine, p, secs) {
  const s = st(p);
  if (!s.want6) { if (secs > 0) engine.skillBeat(secs, () => {}); return; }
  s.want6 = false;
  engine.skillBeat(Math.max(secs, 0.1), () => engine.queueCutscene(p, CUT.blood6));
}

// ---------- มีด ----------
function knifeCells(engine, p) {
  if (!p.pos) return [];
  const map = engine.boardMap();
  const cells = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 1; i <= KNIFE.len; i++) {
      const x = p.pos.x + dx * i, y = p.pos.y + dy * i;
      if (!Board.inBounds(map, x, y) || map.terrain[K(x, y)]) break;
      cells.push([dx * i, dy * i]);
    }
  }
  return cells;
}
function throwKnife(engine, p, t) {
  const s = st(p);
  if (!s.stopping) s.knifeReady = engine.roundNumber + KNIFE.cd;
  else s.knives = (s.knives || 0) + 1;
  const to = t.pos ? { ...t.pos } : null;
  const res = standHit(engine, p, t, "Throwing knife", KNIFE.dmg, false, { stack: false });
  if (res.dmg && t.alive && engine.applyBleed(t, KNIFE.bleed) > 0) engine.log(`🩸 ${t.name} เลือดไหล ${KNIFE.bleed}`);
  fx(engine, p, "knife", { from: { ...p.pos }, to, targetId: t.id, dodge: !!res.dodge, frozen: s.stopping });
  return FX.knife;
}

// ---------- Stand ----------
function stand(engine, p, form, targets, dir) {
  const s = st(p);
  const m = STAND[form];
  s[`${form}Ready`] = engine.roundNumber + m.cd;
  const hits = [];
  for (const id of targets || []) {
    const t = engine.players[id];
    if (!foe(engine, p, t)) continue;
    const res = standHit(engine, p, t, m.name, m.dmg, m.pierce);
    if (res.dmg && t.alive) engine.applyDebuff(t, m.status, 1, m.turns + (engine.hasActed(t.id) ? 1 : 0));
    hits.push({ id, dodge: !!res.dodge });
  }
  fx(engine, p, form, { from: { ...p.pos }, dir, hits, frozen: s.stopping });
  return form === "shine" ? FX.shine : FX.muda;
}

// ---------- Za warudo / หยุดเวลา ----------
function startStop(engine, p, kind) {
  const s = st(p);
  s.stopping = true;
  s.actions = s.pending;
  s.knives = 0;
  s.pending = 0;
  s.savedQuota = !!p.skillUsedRound;
  p.skillUsedRound = false;
  const enter = () => {
    engine.timeStop.freeze(p.id);
    fx(engine, p, "timeStop", { at: { ...p.pos }, actions: s.actions });
    engine.sfx(SFX.stop, null, { voice: p.id });
    engine.log(`⏱️ ${p.name} — เวลาหยุด (${s.actions} Action)`);
  };
  if (kind === "dioInterrupt") {
    fx(engine, p, "press", { at: { ...p.pos } });
    engine.sfx(SFX.world);
    engine.skillBeat(FX.press, enter);
  } else enter();
  engine.skillBeat(FX.stop, () => {});
  engine.pausePlayingForCutscene();
}
function endStop(engine, p) {
  const s = st(p);
  if (!s.stopping) return 0;
  s.stopping = false;
  s.actions = 0;
  p.skillUsedRound = s.savedQuota;
  const hits = engine.timeStop.unfreeze();
  fx(engine, p, "timeResume", { at: p.pos ? { ...p.pos } : null, hits });
  engine.sfx(SFX.resume, null, { voice: p.id });
  engine.log("⏱️ เวลาเริ่มเดินต่อ");
  return FX.resume;
}
function pressWorld(engine, p) {
  const s = st(p);
  s.pending = s.meter;
  s.pendingRound = engine.roundNumber;
  s.meter = 0;
  s.worldReady = engine.roundNumber + worldCd(s);
  s.worldSever = engine.severStamp();
  fx(engine, p, "press", { at: { ...p.pos } });
  if (s.blood >= BLOOD.surge) {
    engine.skillBeat(FX.press, () => {});
    engine.flowHandoff(p.id, "dioWorld");
  }
}
// แทรกตาถูก Return to Zero ยกเลิก = กดซ้ำไม่ได้จนจบตาคนนั้น (ไม่เสียอะไร · กันกดคลิปซ้ำถ่วงตาคนอื่น)
const denyKey = (engine) => `${engine.roundNumber}:${engine.actorId}`;
function canInterrupt(engine, p) {
  if (!isDio(p) || !p.alive || !p.pos) return false;
  const s = st(p);
  if (s.deniedAt === denyKey(engine)) return false;
  const actor = engine.players[engine.actorId];
  if (engine.gameState !== "ACTION" || !actor || actor.id === p.id || actor.summon || !engine.action) return false;
  if (engine.sameSide && engine.sameSide(p, actor)) return false;
  return !s.stopping && !s.pending && s.meter > WORLD.tax && cdLeft(s.worldReady, engine.roundNumber) === 0
    && !engine.stuck(p) && !((p.statuses.noskill || 0) > 0);
}
function interrupt(engine, p) {
  if (!canInterrupt(engine, p)) return false;
  const s = st(p);
  // กดท่าไม้ตาย = Return to Zero ย้อนแน่นอน ทางนี้ไม่ผ่าน useSkill จึงเช็กเอง (ก่อนหัก/ก่อนเสียงทุกอย่าง — กฎคลิป)
  if (engine.timeStop.denyPress(p)) { s.deniedAt = denyKey(engine); return true; }
  s.pending = s.meter - WORLD.tax;
  s.meter = 0;
  s.worldReady = engine.roundNumber + worldCd(s);
  s.worldSever = engine.severStamp();
  p.ultRound = engine.roundNumber;
  engine.skillFlash({ name: "Za warudo!!!!!!", img: IMG.world, by: p.name, color: engine.colorOf(p) });
  engine.log(`⏱️ ${p.name} แทรก Za warudo!!!!!!`);
  engine.timeStop.interrupt(p.id, "dioInterrupt", engine.timeLeft);
  return true;
}

// ---------- Road Roller ----------
// ช่องว่างข้างเป้าที่ใกล้ดิโอที่สุด
function landingSpot(engine, p, t, at) {
  const size = engine.sizeOf(t);
  const tiles = [];
  for (let d = 1; d <= 3 && !tiles.length; d++) {
    for (let x = at.x - d; x <= at.x + size - 1 + d; x++) {
      for (let y = at.y - d; y <= at.y + size - 1 + d; y++) {
        const inside = x >= at.x && x < at.x + size && y >= at.y && y < at.y + size;
        if (!inside && engine.tileFree(x, y, p.id)) tiles.push({ x, y });
      }
    }
  }
  tiles.sort((a, b) => (Math.abs(a.x - at.x) + Math.abs(a.y - at.y)) - (Math.abs(b.x - at.x) + Math.abs(b.y - at.y))
    || (Math.abs(a.x - p.pos.x) + Math.abs(a.y - p.pos.y)) - (Math.abs(b.x - p.pos.x) + Math.abs(b.y - p.pos.y)));
  return tiles[0] || null;
}
function roller(engine, p, t) {
  const at = t.pos ? { ...t.pos } : null;
  engine.log(`🚧 ${p.name} Road Roller`);
  fx(engine, p, "rollerLift", { at: { ...p.pos }, to: at });
  engine.skillBeat(FX.lift, () => {
    engine.queueCutscene(p, CUT.roller);
    engine.deferAfterCutscene(() => {
      // รถตกทับพร้อมดิโอบนหลังคา → ต่อยรัว → รถระเบิด: ผลลงตอนระเบิด (ผู้ใช้สั่ง 2026-11-05)
      const spot = at && landingSpot(engine, p, t, at);
      if (spot) { engine.ice.revealPushed(p); p.pos = spot; }
      fx(engine, p, "roller", { at, land: { ...p.pos }, targetId: t.id, size: engine.sizeOf(t) });
      engine.skillBeat(FX.slam, () => engine.sfx(SFX.muda));
      engine.skillBeat(FX.rush, () => {
        if (t.alive) standHit(engine, p, t, "Road Roller", ROLLER.dmg, false);
        engine.sfx(SFX.explode);
        playSurge(engine, p, FX.boom);
      });
    });
  });
}

// ---------- Last Stand ----------
const handScore = (hand) => hand.reduce((a, c) => a + c.v, 0);
const COLORS = ["red", "blue", "green", "yellow"];
function newDeck() {
  const deck = [];
  for (const c of COLORS) for (let v = 1; v <= 10; v++) deck.push({ v, c });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
const botSide = (u) => !u || !!u.summon || u.connected === false;
function duelDraw(d, side) {
  const c = d.deck.pop();
  if (c) d.hands[side].push(c);
  if (!c || handScore(d.hands[side]) >= LAST.target) d.stood[side] = true;
}
function autoPlay(d, side) {
  while (!d.stood[side]) {
    if (handScore(d.hands[side]) >= LAST.botStop) d.stood[side] = true;
    else duelDraw(d, side);
  }
}
function startDuel(engine, p) {
  const s = st(p);
  s.duelPending = false;
  const q = engine.players[s.duelFoe];
  if (!q || !q.alive) { // ผู้โจมตีตายก่อนเริ่ม = รอดโดยไม่มีใครให้ดวล
    p.hp = Math.max(p.hp, LAST.win);
    return;
  }
  const d = { deck: newDeck(), dioId: p.id, foeId: q.id, hands: { dio: [], foe: [] }, stood: { dio: false, foe: false }, winner: null };
  duelDraw(d, "dio");
  duelDraw(d, "foe");
  if (botSide(p)) autoPlay(d, "dio");
  if (botSide(q)) autoPlay(d, "foe");
  s.duel = d;
  engine.log(`🃏 Last Stand — ${p.name} ดวลกับ ${q.name}`);
  engine.skillBeat(d.stood.dio && d.stood.foe ? 2 : LAST.seconds, () => resolveDuel(engine, p), { open: true });
}
function resolveDuel(engine, p) {
  const s = st(p);
  const d = s.duel;
  if (!d || d.winner) return;
  d.stood.dio = d.stood.foe = true;
  const a = handScore(d.hands.dio), b = handScore(d.hands.foe);
  const aBust = a > LAST.target, bBust = b > LAST.target;
  const win = aBust ? bBust : bBust || a >= b; // เสมอ / แตกทั้งคู่ = ดิโอชนะ (ผู้ใช้สั่ง 2026-11-05)
  d.winner = win ? "dio" : "foe";
  engine.log(`🃏 Last Stand: ${p.name} ${a} — ${b} ${(engine.players[d.foeId] || {}).name || ""}`);
  engine.skillBeat(FX.result, () => finishDuel(engine, p));
}
function finishDuel(engine, p) {
  const s = st(p);
  const d = s.duel;
  s.duel = null;
  if (!d) return;
  const q = engine.players[d.foeId];
  if (d.winner === "dio") {
    p.hp = LAST.win;
    const at = q && q.pos ? { ...q.pos } : null;
    if (q && q.alive) engine.withEffectSource(p, () => { engine.dealMixed(q, LAST.win, false); settle(engine, q); });
    fx(engine, p, "lastWin", { targetId: q ? q.id : null, from: at, at: p.pos ? { ...p.pos } : null, amount: LAST.win });
    engine.log(`🩸 ${p.name} ชนะ Last Stand — ดูดเลือด ${LAST.win}`);
    engine.skillBeat(1.6, () => {});
    return;
  }
  engine.log(`💀 ${p.name} แพ้ Last Stand`);
  engine.queueCutscene(p, CUT.lastFail);
  engine.deferAfterCutscene(() => {
    const die = () => { engine.instantDeath(p, true); if (!p.alive) { p.pos = null; engine.log(`💀 ${p.name} เลือดจริงหมด ตกรอบ!`); } };
    if (q) engine.withEffectSource(q, die); else die();
  });
}

const actionCost = (tier) => (tier === "ultimate" ? ROLLER.actions : tier === "secondary" ? STAND_ACTIONS : 1);
const knifeLeft = (s) => Math.max(0, KNIFE.stopUses - (s.knives || 0));

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, HP, ARMOR, MOV, RANGE, METER, BLOOD, KNIFE, STAND, STAND_COST, STAND_ACTIONS, WORLD, ROLLER, LAST, FX,
  isDio, handScore,
  duelResolveForTest: resolveDuel,

  resetCombat(p) { p.dio = isDio(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  voiceLines(p) { return isDio(p) ? { struck: [SFX.hit] } : null; },
  attackSound(p) { return isDio(p) ? SFX.attack : null; },
  attackStyle(p) { return isDio(p) ? "dioPunch" : null; },
  deferStrikeDamage(p) { return stopping(p); },

  // ---------- กลางวัน/กลางคืน ----------
  adjustIncomingDamage(engine, p, n) {
    if (!isDio(p) || !(n > 0) || engine.dotTick) return n;
    return Math.max(0, n + (engine.isNightRound(engine.worldRound) ? -1 : 1));
  },

  // ---------- สกิล ----------
  skillCost(p, tier, base) { return !isDio(p) || st(p).stopping || tier === "ultimate" ? 0 : base; },
  skillFree(p) { return stopping(p); },
  skillArea(p, tier, area) {
    if (!isDio(p)) return area;
    if (tier === "basic") return { ...area, cells: knifeCells(require("../server/engine").engine, p) };
    if (tier === "ultimate" && st(p).stopping) return ROLLER_SKILL.area;
    return area;
  },
  skillPub(p, tier) {
    if (!isDio(p)) return null;
    const s = st(p);
    const r = require("../server/engine").engine.roundNumber;
    if (tier === "basic" && s.stopping) return { cost: 0, costLabel: "1 Action" };
    if (tier === "secondary") {
      return {
        ...(s.stopping ? { cost: 0, costLabel: `${STAND_ACTIONS} Action` } : {}),
        choices: Object.keys(STAND).map((k) => ({
          key: k, name: STAND[k].name, img: STAND[k].img, desc: STAND_DESC[k], area: LINE_AREA,
          cost: s.stopping ? 0 : STAND_COST, actions: s.stopping ? STAND_ACTIONS : 0, cd: cdLeft(s[`${k}Ready`], r),
        })),
      };
    }
    if (tier === "ultimate") return s.stopping ? { ...ROLLER_SKILL, flash: true } : { costLabel: `Time Meter ${s.meter}` };
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isDio(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u));
    if (tier === "basic") return !!t && (s.stopping ? s.actions >= 1 && knifeLeft(s) > 0 : cdLeft(s.knifeReady, r) === 0);
    if (tier === "secondary") return !!STAND[opts.form] && cdLeft(s[`${opts.form}Ready`], r) === 0 && (!s.stopping || s.actions >= STAND_ACTIONS);
    if (tier === "ultimate") {
      if (s.stopping) return !!t && s.actions >= ROLLER.actions;
      return s.meter >= 1 && !s.pending && cdLeft(s.worldReady, r) === 0;
    }
    return false;
  },
  // ร่างหยุดเวลา: ใช้ Action แทนโควตาสกิล · ใช้แล้วยังเดินได้
  skipsTurnQuota(p) { return stopping(p); },
  ignoresTurnQuota(p) { return stopping(p); },
  keepsMove(engine, p) { return stopping(p); },
  // Action หมด / Road Roller = เวลาเดินต่อ (ตาพิเศษจบ → extraTurnOutro)
  endsTurn(engine, p, tier) {
    if (!stopping(p)) return false;
    return tier === "ultimate" || st(p).actions - actionCost(tier) <= 0;
  },
  skillSound(p, tier, opts = {}) {
    if (!isDio(p)) return null;
    if (tier === "basic") return SFX.knife;
    if (tier === "secondary") return STAND[opts.form] ? STAND[opts.form].sfx : null;
    return st(p).stopping ? null : SFX.world; // Road Roller มีคลิป = ไม่มีเสียงนำ
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isDio(p)) return "";
    const s = st(p);
    const inStop = s.stopping;
    if (inStop) s.actions -= actionCost(tier);
    const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u));
    if (tier === "basic") playSurge(engine, p, throwKnife(engine, p, t));
    else if (tier === "secondary") playSurge(engine, p, stand(engine, p, opts.form, targets, opts.dir));
    else if (inStop) roller(engine, p, t);
    else pressWorld(engine, p);
    if (!inStop && tier !== "ultimate") addMeter(p, 1);
    return "";
  },
  // ตีปกติ: Time Meter +1 (ตีอะไรก็ได้) · ดูดเลือดเมื่อโดนศัตรู
  afterStrike(engine, p) { if (isDio(p)) addMeter(p, 1); },
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isDio(attacker) || counter || !res || !(res.dmg > 0) || res.dodge || !foe(engine, attacker, target) && target.alive) return;
    drain(engine, attacker, target, target.pos ? { ...target.pos } : null);
    const s = st(attacker);
    if (s.want6) { s.want6 = false; engine.queueCutscene(attacker, CUT.blood6); }
  },
  // ร่างหยุดเวลา: ตีปกติใช้ 1 Action ไม่จบตา · ยังเดินต่อได้ · Action หมด = จบ
  extraStrike(engine, p) {
    if (!stopping(p)) return false;
    const s = st(p);
    s.actions -= 1;
    if (s.actions <= 0) return false;
    if (engine.action) engine.action.locked = false;
    return true;
  },
  skillLocks(engine, p) {
    if (!isDio(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    if (s.stopping) {
      return {
        basic: { cd: 0, locked: s.actions < 1 || knifeLeft(s) === 0 },
        secondary: { cd: 0, locked: s.actions < STAND_ACTIONS },
        ultimate: { cd: 0, locked: s.actions < ROLLER.actions },
      };
    }
    return {
      basic: { cd: cdLeft(s.knifeReady, r), locked: false },
      secondary: { cd: 0, locked: false },
      ultimate: { cd: cdLeft(s.worldReady, r), locked: s.meter < 1 || s.pending > 0 },
    };
  },

  // ---------- ตาหยุดเวลา (server/timeStop.js) ----------
  charAction(engine, p, key) { return isDio(p) && key === "dio:world" && interrupt(engine, p); },
  onOrderBegin(engine) {
    const order = engine.turnOrder || [];
    const list = Object.values(engine.players).filter(isDio);
    for (const p of list) {
      if (!p.dio) continue;
      if (order[0] === p.id && p.alive) addMeter(p, METER.first);
      if (p.dio.pending > 0 && p.dio.pendingRound < engine.roundNumber) {
        if (p.alive && p.pos) engine.timeStop.queueExtra(p.id, "dioWorld");
        else p.dio.pending = 0;
      }
    }
  },
  onExtraTurn(engine, p, kind) {
    if (!isDio(p) || (kind !== "dioWorld" && kind !== "dioInterrupt")) return;
    startStop(engine, p, kind);
  },
  extraTurnOutro(engine, p) { return isDio(p) ? endStop(engine, p) : 0; },
  // Return to Zero ของโจรุโน่ทำเวลาเดินต่อ: Za warudo ครั้งนี้จบ — Action ที่จุดย้อนคืนมาไม่กลับไปหยุดเวลาเทิร์นหน้า · ตาพิเศษจบตาม (ไม่มีตาแถม)
  rewindEndsExtra: true,
  onFreezeBroken(engine, byId) {
    const p = engine.players[byId];
    if (!isDio(p)) return;
    const s = st(p);
    s.pending = 0;
    if (!s.stopping) return;
    s.stopping = false;
    s.actions = 0;
    p.skillUsedRound = s.savedQuota;
  },
  // ผลค้าง: Za warudo ที่รอต้นเทิร์นหน้า (server/sever.js) · Time Meter ถูกใช้ไปแล้ว คูลดาวน์เดินต่อ
  severables(engine, p) {
    if (!isDio(p) || !p.alive) return [];
    const s = st(p);
    return s.pending > 0 && !s.stopping
      ? [{ key: "world", label: "Za warudo!!!!!!", at: s.worldSever, cancel: () => { s.pending = 0; } }]
      : [];
  },

  // ---------- Last Stand ----------
  preventDeath(engine, p) {
    if (!isDio(p)) return false;
    const s = st(p);
    if (s.duelPending) { p.hp = 1; return true; } // โดนซ้ำก่อนเริ่มดวล
    if (s.lastUsed) return false;
    const src = engine.effectSourceId && engine.players[engine.effectSourceId];
    if (!src || !foe(engine, p, src)) return false; // สถานะ/ไฟ/ของบนพื้น (ไม่มีผู้โจมตี) = ตายเลย
    s.lastUsed = true;
    s.duelPending = true;
    s.duelFoe = src.id;
    p.hp = 1;
    engine.log(`🃏 ${p.name} — Last Stand!`);
    engine.queueCutscene(p, CUT.last);
    engine.deferAfterCutscene(() => startDuel(engine, p));
    engine.wantFlow();
    return true;
  },
  duelAction(engine, id, act) {
    const u = engine.players[id];
    const p = Object.values(engine.players).find((o) => isDio(o) && o.dio && o.dio.duel);
    if (!p || !u) return false;
    const d = p.dio.duel;
    if (d.winner) return false;
    const side = id === d.dioId ? "dio" : id === d.foeId ? "foe" : null;
    if (!side || d.stood[side]) return false;
    if (act === "draw") duelDraw(d, side);
    else d.stood[side] = true;
    if (d.stood.dio && d.stood.foe) engine.releaseBeat();
    else engine.broadcastState();
    return true;
  },
  // ข้อมูลดวลต่อผู้ชม (ผู้ใช้สั่ง 2026-11-05): เห็นแต้ม/หน้าการ์ดเฉพาะมือตัวเอง · ที่เหลือคว่ำ จนทั้งคู่กดพอแล้วเปิดพร้อมกัน
  //  ids = ไอดีของผู้ชม (ตัวเอง + ตัวที่คุมอยู่ — ระบบคู่) · ไม่ส่งหน้าการ์ดที่คว่ำไปเครื่องผู้ชมเลย
  duelView(engine, ids) {
    const p = Object.values(engine.players).find((o) => isDio(o) && o.dio && o.dio.duel);
    if (!p) return null;
    const d = p.dio.duel;
    const side = ids.includes(d.dioId) ? "dio" : ids.includes(d.foeId) ? "foe" : null;
    const open = (k) => !!d.winner || k === side;
    const hand = (k) => (open(k) ? d.hands[k] : d.hands[k].map(() => ({ hidden: true })));
    const score = (k) => (open(k) ? handScore(d.hands[k]) : null);
    return {
      dioId: d.dioId, foeId: d.foeId, side, stood: d.stood, winner: d.winner, target: LAST.target,
      hands: { dio: hand("dio"), foe: hand("foe") }, scores: { dio: score("dio"), foe: score("foe") },
    };
  },

  onRoundStartTick(engine, p) {
    if (!isDio(p) || !p.dio || p.dio.startVoice) return;
    p.dio.startVoice = true;
    engine.sfx(SFX.start, null, { voice: p.id });
  },
  onDeath(engine, p) {
    if (!isDio(p) || !p.dio) return;
    p.dio.pending = 0;
    if (p.dio.stopping) endStop(engine, p);
  },

  // ---------- ข้อมูลให้ client ----------
  dioState(engine, p) {
    if (!isDio(p)) return undefined;
    const s = st(p);
    return {
      meter: s.meter, meterMax: meterMax(s), blood: s.blood, bloodMax: BLOOD.max,
      stopping: !!s.stopping, actions: s.actions, pending: s.pending, lastUsed: !!s.lastUsed,
      worldCd: cdLeft(s.worldReady, engine.roundNumber), canInterrupt: canInterrupt(engine, p),
      interruptActions: Math.max(0, s.meter - WORLD.tax),
    };
  },
};

// ============================================================
//  ดิเอโก้ แบรนโด (อสูรกายดึกดำบรรพ์ — JoJo Part 7 · สแตนด์ Scary Monsters) — ระดับยาก · id "diego_dino" · เลือกซ้ำได้หลายคน
//  กติกาทั้งหมดผู้ใช้ตัดสิน 2026-11-18 — GRID_PLAN.md §7.36 · หน้าเลือกตัว = โหมดของ diego_alt (characters.js modes[].char)
//
//  พลังชีวิต 6 · เกราะ 2 (+ โบนัสกลางแบบคนขี่ม้า) · ตีประชิด ธาตุพิษ · ร่างคนเดิน 5 (ขี่ม้า 6) · ร่างไดโนเสาร์เดิน 6 · เริ่มเกมขี่ม้า
//  สองร่าง ชุดสกิลแยกขาด (ไม่มีสกิลซ้อนกัน):
//   ร่างคน     พื้นฐาน อย่ามาดูถูกกันนะ (3) · รอง เข้าร่วมเผ่าพันธุ์ (3) · ท่าไม้ตาย ฉันจะฆ่าแก (6 · คูลดาวน์ 3 · ยังเดินได้ · ขี่ม้าใช้ไม่ได้)
//   ไดโนเสาร์  พื้นฐาน ว๊ากกก (2) · รอง อ๊ากกก (3) · ท่าไม้ตาย ย่ำกระหม่อม (4 · คูลดาวน์ 3) — ใช้ไอเทม/ขี่ม้าไม่ได้
//  ติดตัว: ม้าซิลเวอร์ บูลเล็ต (characters/_horse.js — แบบ §7.12) · ไวรัสบรรพกาล (สถานะ dinoVirus 0–3) · นักล่าดึกดำบรรพ์ (ความบ้าคลั่ง 0–5 → ปุ่ม HUD การกลายพันธุ์)
//  ควบคุมร่าง (เข้าร่วมเผ่าพันธุ์) = ระบบกลาง server/possess.js
//  ลบสกิลติดตัว (server/passiveSeal.js): ไม่ติดไวรัส · ไม่ได้ความบ้าคลั่ง · กดกลายพันธุ์ไม่ได้ · เกราะร่างไดโนเสาร์ไม่ฟื้น/ไม่แปลงเป็นพลังชีวิต
//    · ตีปกติไม่เป็นธาตุพิษ · ม้าแบบ §7.12 (ไม่รับดาเมจ · ขึ้นลงไม่ได้)
//  คลิปทุกครั้ง · action ที่มีคลิปไม่มีเสียงเอฟเฟกต์/เสียงพากย์ของท่าซ้อน (CLAUDE.md)
//  เอฟเฟกต์: engine.boardFx("dinoFx", { kind, id, … }) — client/src/board/dinoFx.js
// ============================================================
const Board = require("../server/board");
const Horse = require("./_horse");
const PassiveSeal = require("../server/passiveSeal");
const Possess = require("../server/possess");

const ID = "diego_dino";
const DIR = "/characters/diego_dino";
const IMG = {
  cover: `${DIR}/cover.jpg`,
  half: `${DIR}/diego_half.webp`,
  full: `${DIR}/diego_full_form.webp`,
  scorn: `${DIR}/skill1.jpg`,
  possess: `${DIR}/skill2.jpg`,
  swarm: `${DIR}/skill3.jpg`,
  charge: `${DIR}/skill1_2.webp`,
  leap: `${DIR}/skill2_2.jpg`,
  stomp: `${DIR}/skill3_2.jpg`,
};
const VIDEO = {
  swarm: `${DIR}/skill3_start.mp4`, swarmHit: `${DIR}/skill3_hit.mp4`, transform: `${DIR}/transform.mp4`,
  leap: `${DIR}/leap_bite.mp4`, stomp: `${DIR}/stomp.mp4`,
};
const CUT = { swarm: "dinoSwarm", swarmHit: "dinoSwarmHit", transform: "dinoTransform", leap: "dinoLeap", stomp: "dinoStomp" };
// เสียงเอฟเฟกต์ (client/src/audio.js — effect_sound/diego_dino · สังเคราะห์ .claude/plans/diego-dino-sfx.py)
const SFX = {
  claw: "dino_claw", bite: "dino_bite", crack: "dino_crack", virus: "dino_virus", possess: "dino_possess",
  charge: "dino_charge", slam: "dino_slam", leap: "dino_leap", drain: "dino_drain", revert: "dino_revert",
};
// เสียงพากย์ (ตัดจากไฟล์ผู้ใช้ — หน้าฟัง .claude/plans/diego-dino-voice.html) · strike เล่นเองใน preAttackClip (มีคลิป = เงียบ)
const VOICE = {
  human: {
    turn: ["dino_v_h01", "dino_v_h02", "dino_v_h05"],
    strike: [],
    struck: ["dino_v_e01", "dino_v_e04", "dino_v_e09"],
    basic: ["dino_v_h13", "dino_v_e02"],
    secondary: ["dino_v_h14", "dino_v_e03"],
    ultimate: [], // คลิป
  },
  dino: {
    turn: ["dino_v_d03", "dino_v_d06"],
    strike: [],
    struck: ["dino_v_d01", "dino_v_d05"],
    basic: ["dino_v_d04"],
    secondary: [], // โดน = คลิป · พลาด = เสียงกระโดด
    ultimate: [], // คลิป
  },
};
const STRIKE_VOICE = { human: ["dino_v_h07", "dino_v_h08", "dino_v_h09", "dino_v_h10", "dino_v_h12"], dino: ["dino_v_d01", "dino_v_d03", "dino_v_d05"] };
const VOICE_REVERT = "dino_v_t02";

const HP = 6;
const ARMOR = 2;
const MOV = 5;
const MOV_HORSE = 6;
const MOV_DINO = 6;
const RANGE = [1, 1];
const HORSE = { hp: 5, cd: 3, name: "ซิลเวอร์ บูลเล็ต" }; // เท่าร่างโลกคู่ขนาน (เกราะโบนัส +2 อยู่ที่ม้า — server/combat.js STAT_BONUS_OF)
const SCORN = { cost: 3, armor: 2, heal: 2, low: 1, turns: 2 };
const POSSESS = { cost: 3, need: 3 };
const SWARM = { cost: 6, cd: 3, len: 4, dmg: 1, hit: 3, poison: 2, bleed: 1 };
const CHARGE = { cost: 2, len: 4, dmg: 2, push: 2, bump: 1 };
const LEAP = { cost: 3, len: 4, dmg: 3, drain: 2 };
const STOMP = { cost: 4, cd: 3, radius: 4, dmg: 3, drain: 2 };
const VIRUS = { max: 3, life: 3 };
const FRENZY = { max: 5, need: 2, upkeep: 1 };
const DINO = { armor: 6, gain: 3, regen: 1 };
// จังหวะเอฟเฟกต์ (วินาที) — ต้องตรงกับ DINO_T ใน client/src/board/dinoFx.js
const T = { charge: 0.75, leap: 0.7, swarm: 0.9, stomp: 0.95, possess: 1.2 };

const SKILLS = {
  human: {
    basic: {
      name: "อย่ามาดูถูกกันนะ", img: IMG.scorn, cost: SCORN.cost, area: { kind: "self" },
      desc: `เกราะ −${SCORN.armor} → ฟื้นพลังชีวิต ${SCORN.heal} (เกราะไม่ถึง ${SCORN.armor} = เกราะ +${SCORN.low} แทน) · ${SCORN.turns} เทิร์น: ตีปกติ/สกิลโดน = ไวรัสบรรพกาล +2 ต่อครั้ง`,
    },
    secondary: {
      name: "เข้าร่วมเผ่าพันธุ์", img: IMG.possess, cost: POSSESS.cost, area: { kind: "target", range: 99, hostile: true },
      desc: `ศัตรู 1 คนทั้งกระดานที่มีไวรัสบรรพกาล ${POSSESS.need}: ล้างไวรัส · ตาเดินถัดไปของเป้า ดิเอโก้ควบคุมแทน (เดิน/สกิล/ตีปกติ · ใช้ไอเทมไม่ได้ · เป้าเป็นฝ่ายเดียวกับดิเอโก้) จบตานั้นแล้วหมดผล`,
    },
    ultimate: {
      name: "ฉันจะฆ่าแก", img: IMG.swarm, cost: SWARM.cost, area: { kind: "line", len: SWARM.len, width: 1, hostile: true },
      desc: `เลือกทิศ แนว ${SWARM.len}×1: ฝูงไดโนเสาร์ชนศัตรูคนแรก ความเสียหาย ${SWARM.dmg} + ถูกตรึงจนจบเทิร์นนี้ · ตีปกติใส่คนนั้น (ครั้งเดียว) = ความเสียหาย ${SWARM.hit} + พิษร้าย ${SWARM.poison} + เลือดไหล ${SWARM.bleed} แล้วปลดตรึง · ใช้แล้วยังเดินได้ · ขี่ม้าใช้ไม่ได้ (คูลดาวน์ ${SWARM.cd} เทิร์น)`,
    },
  },
  dino: {
    basic: {
      name: "ว๊ากกก", img: IMG.charge, cost: CHARGE.cost, area: { kind: "line", len: CHARGE.len, width: 1, hostile: true },
      desc: `เลือกทิศ พุ่งแนว ${CHARGE.len}×1: ทุกคนในแนว ความเสียหาย ${CHARGE.dmg} + ผลัก ${CHARGE.push} ช่องตามทิศ · ชนขอบ/สิ่งกีดขวาง +${CHARGE.bump}`,
    },
    secondary: {
      name: "อ๊ากกก", img: IMG.leap, cost: LEAP.cost, area: { kind: "line", len: LEAP.len, width: 1, hostile: true },
      desc: `เลือกทิศ กระโดดแนว ${LEAP.len}×1 หยุดที่ศัตรูคนแรก: ความเสียหาย ${LEAP.dmg} + ดูดแต้มสกิล ${LEAP.drain} (ขาดแต้มละ ความเสียหาย +1) · ไม่โดนใคร = ลงปลายแนว`,
    },
    ultimate: {
      name: "ย่ำกระหม่อม", img: IMG.stomp, cost: STOMP.cost, area: { kind: "tile", range: "mov", place: "list", foot: 1, blast: STOMP.radius, hostile: true, tiles: [] },
      desc: `กระโดดลงช่องว่างในระยะเดิน: ศัตรูรอบจุดลงระยะ ${STOMP.radius} ความเสียหาย ${STOMP.dmg} + ถูกตรึงตาเดินถัดไป + ดูดแต้มสกิล ${STOMP.drain} (ขาดแต้มละ ความเสียหาย +1) (คูลดาวน์ ${STOMP.cd} เทิร์น)`,
    },
  },
};

const K = Board.key;
const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const passiveOn = (p) => PassiveSeal.on(p);

function fresh() {
  return {
    form: "human",
    frenzy: 0,
    toggleRound: -1,  // เปิด/ปิดการกลายพันธุ์แล้วในเทิร์นนี้ (เลขเทิร์น · −1 = ยังไม่เคย)
    formSever: 0,
    scornEnd: 0,      // อย่ามาดูถูกกันนะ: ไวรัส ×2 ขณะ roundNumber < scornEnd
    scornSever: 0,
    swarmReady: 0,    // ฉันจะฆ่าแก กดได้อีกเมื่อ roundNumber >= ค่านี้
    stompReady: 0,
    clipStrike: false, // ตีปกติครั้งนี้ใส่คนที่ถูกฝูงไดโนเสาร์ตรึง → คลิป (preAttackClip) แทนเสียง
    possessSever: 0,
    ...Horse.fresh(HORSE),
  };
}
function st(p) { return p.dino || (p.dino = fresh()); }
const isDino = (p) => isMe(p) && st(p).form === "dino";
function fx(engine, p, kind, data) {
  engine.boardFx("dinoFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}
const horseCfg = { ...HORSE, fx: (engine, p, mode) => engine.boardFx("diegoFx", { kind: "horse", id: p.id, color: engine.colorOf(p), at: { ...p.pos }, mode }) };
const foe = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t);
const turnsFor = (engine, t, n) => n + ((engine.hasActed(t.id) || engine.actorId === t.id) ? 1 : 0);
const skillOf = (p, tier) => SKILLS[isDino(p) ? "dino" : "human"][tier];

// ---------- ไวรัสบรรพกาล / ความบ้าคลั่ง ----------
function addFrenzy(p, n) {
  if (!passiveOn(p) || n <= 0) return;
  const s = st(p);
  s.frenzy = Math.min(FRENZY.max, s.frenzy + n);
}
// ติดไวรัสใส่ t (ต้านได้) → จำนวนหน่วยที่เพิ่มจริง · เต็มแล้ว = นับเวลาใหม่ (ไม่เพิ่ม)
function infect(engine, p, t, n) {
  if (!isMe(p) || !passiveOn(p) || !foe(engine, p, t)) return 0;
  const cur = (t.statuses && t.statuses.dinoVirus) || 0;
  const add = Math.max(0, Math.min(n, VIRUS.max - cur));
  const ok = engine.withEffectSource(p, () => engine.applyDebuff(t, "dinoVirus", null, Math.max(1, cur + add)));
  if (!ok) return 0;
  t.statuses.dinoVirus = cur + add;
  t.dinoVirusAt = engine.roundNumber;
  if (add > 0) {
    addFrenzy(p, add);
    engine.log(`🦠 ${t.name} ติดไวรัสบรรพกาล +${add} (${t.statuses.dinoVirus}/${VIRUS.max})`);
    engine.boardFx("dinoFx", { kind: "virus", id: p.id, targetId: t.id, at: { ...t.pos }, n: t.statuses.dinoVirus });
  }
  return add;
}
const virusPerHit = (engine, p) => (engine.roundNumber < st(p).scornEnd ? 2 : 1);
const virusOf = (t) => (t && t.statuses && t.statuses.dinoVirus) || 0;

// ---------- ร่าง ----------
function canMutate(engine, p) {
  const s = st(p);
  if (!engine.canAct(p) || !passiveOn(p) || s.toggleRound === engine.roundNumber) return false;
  if (s.form === "dino") return true;
  return !s.mounted && s.frenzy >= FRENZY.need;
}
function toDino(engine, p) {
  const s = st(p);
  s.form = "dino";
  s.toggleRound = engine.roundNumber;
  s.formSever = engine.severStamp();
  engine.healArmor(p, DINO.gain);
  engine.log(`🦖 ${p.name} การกลายพันธุ์ — ร่างไดโนเสาร์ (เกราะ +${DINO.gain})`);
  fx(engine, p, "transform", { at: { ...p.pos } });
  engine.queueCutscene(p, CUT.transform);
  engine.pausePlayingForCutscene();
}
function toHuman(engine, p, why) {
  const s = st(p);
  if (s.form !== "dino") return;
  s.form = "human";
  if (why !== "upkeep") s.toggleRound = engine.roundNumber;
  const max = engine.maxArmorOf(p);
  if (p.armor > max) p.armor = max;
  engine.log(why === "upkeep" ? `🦖 ${p.name} ความบ้าคลั่งหมด — คืนร่างคน` : why === "sever" ? `🦖 ร่างไดโนเสาร์ของ ${p.name} ถูกตัด` : `🦖 ${p.name} คืนร่างคน`);
  if (p.pos) fx(engine, p, "revert", { at: { ...p.pos } });
  engine.sfx(SFX.revert);
  engine.sfx(VOICE_REVERT, null, { voice: p.id });
}

// ---------- ดาเมจสกิล (เกราะก่อน · หลบได้ · ฆ่าได้) ----------
function strikeSkill(engine, p, t, name, dmg) {
  return engine.withEffectSource(p, () => engine.skillStrike(p, t, name, { bonus: dmg - 1 }));
}
function bumpHit(engine, p, t, n, name) {
  if (!t.alive || !t.pos) return;
  engine.withEffectSource(p, () => engine.dealMixed(t, n, false));
  engine.log(`💥 ${p.name} ${name} → ${t.name} ชน -${n}`);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) t.pos = null;
}
// ดูดแต้มสกิล: คืน { take, short } (เรียกหลังตีโดน)
function drain(engine, p, t, n) {
  const take = Math.max(0, Math.min(n, t.skillPoints | 0));
  if (take > 0) {
    t.skillPoints -= take;
    engine.addSkill(p, take, "drain");
    engine.log(`🩸 ${p.name} ดูดแต้มสกิล ${t.name} ${take}`);
  }
  return take;
}

// ---------- ร่างคน ----------
function scorn(engine, p) {
  const s = st(p);
  if ((p.armor || 0) >= SCORN.armor) {
    p.armor -= SCORN.armor;
    const got = engine.healHp(p, SCORN.heal);
    engine.log(`🦎 ${p.name} อย่ามาดูถูกกันนะ — เกราะ −${SCORN.armor} → พลังชีวิต +${got}`);
  } else {
    engine.healArmor(p, SCORN.low);
    engine.log(`🦎 ${p.name} อย่ามาดูถูกกันนะ — เกราะ +${SCORN.low}`);
  }
  s.scornEnd = engine.roundNumber + SCORN.turns;
  s.scornSever = engine.severStamp();
  fx(engine, p, "scorn", { at: { ...p.pos } });
}
function possess(engine, p, t) {
  t.statuses.dinoVirus = 0;
  const round = engine.roundNumber + ((engine.hasActed(t.id) || engine.actorId === t.id) ? 1 : 0);
  Possess.mark(t, p, round);
  st(p).possessSever = engine.severStamp();
  engine.log(`🦖 ${p.name} เข้าร่วมเผ่าพันธุ์ — ${t.name} ${round === engine.roundNumber ? "ตาเดินนี้" : "เทิร์นหน้า"}อยู่ใต้การควบคุม`);
  fx(engine, p, "possess", { at: { ...p.pos }, targetId: t.id, to: { ...t.pos } });
}
// แนวพุ่ง: ช่องตามทิศ (คนแรก/สิ่งกีดขวาง)
function lineFirst(engine, p, dir, len) {
  const tiles = engine.chargeTiles(p, dir, len);
  const path = [{ ...p.pos }];
  for (const t of tiles) {
    const u = t.unitId ? engine.players[t.unitId] : null;
    if (foe(engine, p, u)) return { path, hit: u, tiles };
    if (t.obstacle || t.shop || u) break;
    path.push({ x: t.x, y: t.y });
  }
  return { path, hit: null, tiles };
}
function swarm(engine, p, dir) {
  const s = st(p);
  s.swarmReady = engine.roundNumber + SWARM.cd;
  const plan = lineFirst(engine, p, dir, SWARM.len);
  engine.log(`🦖 ${p.name} ฉันจะฆ่าแก — ปล่อยฝูงไดโนเสาร์`);
  engine.queueCutscene(p, CUT.swarm);
  engine.deferAfterCutscene(() => {
    if (!p.alive || !p.pos) return;
    const tip = plan.hit ? { ...plan.hit.pos } : plan.path[plan.path.length - 1];
    fx(engine, p, "swarm", { at: { ...p.pos }, dir, to: tip, targetId: plan.hit ? plan.hit.id : null });
    engine.skillBeat(T.swarm, () => {
      const t = plan.hit;
      engine.hitArea(p, plan.tiles.map((c) => ({ x: c.x, y: c.y })), t ? [t.id] : []);
      if (!t || !t.alive || !t.pos) return;
      const res = strikeSkill(engine, p, t, "ฉันจะฆ่าแก", SWARM.dmg);
      if (!res || res.dodge || res.blocked || !t.alive) return;
      infect(engine, p, t, virusPerHit(engine, p));
      if (engine.withEffectSource(p, () => engine.applyDebuff(t, "rooted", 1, 1))) {
        t.dinoMark = { by: p.id, round: engine.roundNumber };
        engine.log(`⛓️ ${t.name} ถูกฝูงไดโนเสาร์ตรึงไว้`);
        fx(engine, p, "pin", { at: { ...t.pos }, targetId: t.id });
      }
    });
  });
}
const markedBy = (engine, p, t) => !!(t && t.dinoMark && t.dinoMark.by === p.id && t.dinoMark.round === engine.roundNumber && t.alive);

// ---------- ร่างไดโนเสาร์ ----------
function charge(engine, p, dir) {
  const v = Board.LINE_DIRS[dir];
  const tiles = engine.chargeTiles(p, dir, CHARGE.len);
  const ids = new Set(tiles.map((c) => c.unitId).filter(Boolean));
  const along = (u) => Math.abs(Board.wdx ? Board.wdx(p.pos.x, u.pos.x) : u.pos.x - p.pos.x) + Math.abs(u.pos.y - p.pos.y);
  const foes = [...ids].map((id) => engine.players[id]).filter((u) => foe(engine, p, u)).sort((a, b) => along(b) - along(a));
  const from = { ...p.pos };
  engine.log(`🦖 ${p.name} ว๊ากกก — พุ่ง`);
  const hits = [];
  const landed = [];
  engine.withEffectSource(p, () => {
    for (const t of foes) {
      const at = { ...t.pos };
      const res = strikeSkill(engine, p, t, "ว๊ากกก", CHARGE.dmg);
      hits.push({ id: t.id, at, dodge: !!(res && res.dodge), dmg: res ? res.dmg : 0 });
      if (res && !res.dodge && !res.blocked && t.alive && t.pos) { infect(engine, p, t, virusPerHit(engine, p)); landed.push(t); }
    }
    // ผลักไกลสุดก่อน (คนหน้าไม่ชนคนหลังที่กำลังจะถูกผลัก)
    const ctx = engine.ice.begin();
    const bumped = [];
    for (const t of landed) {
      if (!t.alive || !t.pos) continue;
      const mark = ctx.events.length;
      engine.ice.pushUnit(t, { x: v[0], y: v[1] }, ctx, CHARGE.push);
      const knocks = ctx.events.slice(mark).filter((e) => e.kind === "knock" && e.id === t.id && e.collide);
      // ชนขอบ/สิ่งกีดขวาง (ไม่ใช่คน) = +1
      if (knocks.some((e) => { const x = e.to.x, y = e.to.y; return !engine.boardMap() || !Board.inBounds(engine.boardMap(), x, y) || engine.boardMap().terrain[K(x, y)] || engine.shopAt(x, y); })) bumped.push(t);
    }
    engine.ice.flush(ctx);
    for (const t of bumped) bumpHit(engine, p, t, CHARGE.bump, "ว๊ากกก");
  });
  // ดิเอโก้พุ่งไปช่องว่างไกลสุดในแนว (หลังผลัก)
  const path = [{ ...from }];
  for (const c of engine.chargeTiles(p, dir, CHARGE.len)) {
    if (c.obstacle || c.shop || c.unitId) break;
    path.push({ x: c.x, y: c.y });
  }
  const end = path[path.length - 1];
  if (end.x !== from.x || end.y !== from.y) {
    engine.rebaseMove(p);
    p.pos = { ...end };
    engine.setDash({ id: p.id, path });
  }
  engine.hitArea(p, tiles.map((c) => ({ x: c.x, y: c.y })), foes.map((t) => t.id));
  fx(engine, p, "charge", { from, dir, path, hits });
  engine.skillBeat(T.charge, () => { if (hits.some((h) => !h.dodge)) engine.sfx(SFX.slam); });
}
function leap(engine, p, dir) {
  const plan = lineFirst(engine, p, dir, LEAP.len);
  const t = plan.hit;
  const dodge = !!t && engine.withEffectSource(p, () => engine.skillDodge(p, t, "อ๊ากกก"));
  const from = { ...p.pos };
  const land = plan.path[plan.path.length - 1];
  const move = () => {
    if (land.x !== from.x || land.y !== from.y) { engine.rebaseMove(p); p.pos = { ...land }; }
  };
  engine.log(`🦖 ${p.name} อ๊ากกก — กระโดด`);
  if (!t || dodge) {
    move();
    engine.hitArea(p, plan.tiles.map((c) => ({ x: c.x, y: c.y })), t ? [t.id] : []);
    fx(engine, p, "leap", { from, to: { ...land }, dir, targetId: null, dodgeId: dodge ? t.id : null });
    engine.sfx(SFX.leap);
    return;
  }
  // โดน = คลิปกระโดดขย่ำ แล้วผลบนกระดาน
  const short = Math.max(0, LEAP.drain - (t.skillPoints | 0));
  engine.queueCutscene(p, CUT.leap);
  engine.deferAfterCutscene(() => {
    if (!p.alive || !p.pos) return;
    move();
    fx(engine, p, "leap", { from, to: { ...land }, dir, targetId: t.id, at: t.pos ? { ...t.pos } : null });
    engine.skillBeat(T.leap, () => {
      engine.hitArea(p, plan.tiles.map((c) => ({ x: c.x, y: c.y })), [t.id]);
      if (!t.alive || !t.pos) return;
      const res = engine.withEffectSource(p, () => engine.skillStrike(p, t, "อ๊ากกก", { bonus: LEAP.dmg - 1 + short, sure: true }));
      if (!res || res.blocked) return;
      const took = drain(engine, p, t, LEAP.drain);
      if (took > 0) fx(engine, p, "drain", { at: t.pos ? { ...t.pos } : { ...land }, to: { ...p.pos }, targetId: t.id, n: took });
      if (t.alive) infect(engine, p, t, virusPerHit(engine, p));
    });
  });
}
// ช่องลงของย่ำกระหม่อม: ช่องว่างในข้าวหลามตัดระยะเดินปกติ (กระโดดข้าม)
function stompTiles(engine, p) {
  if (!p.pos) return [];
  const map = engine.boardMap();
  const r = engine.baseMovOf(p);
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -(r - Math.abs(dy)); dx <= r - Math.abs(dy); dx++) {
      if (!dx && !dy) continue;
      const x = Board.wx ? Board.wx(p.pos.x + dx) : p.pos.x + dx, y = p.pos.y + dy;
      if (!map || !Board.inBounds(map, x, y)) continue;
      if (engine.tileFree(x, y, p.id)) out.push({ x, y });
    }
  }
  return out;
}
const stompOk = (engine, p, tile) => !!tile && stompTiles(engine, p).some((c) => c.x === tile.x && c.y === tile.y);
function blastTiles(engine, c) {
  const map = engine.boardMap();
  const out = [];
  for (let dy = -STOMP.radius; dy <= STOMP.radius; dy++) {
    for (let dx = -(STOMP.radius - Math.abs(dy)); dx <= STOMP.radius - Math.abs(dy); dx++) {
      if (!dx && !dy) continue;
      const x = Board.wx ? Board.wx(c.x + dx) : c.x + dx, y = c.y + dy;
      if (map && Board.inBounds(map, x, y)) out.push({ x, y });
    }
  }
  return out;
}
function stomp(engine, p, tile) {
  const s = st(p);
  s.stompReady = engine.roundNumber + STOMP.cd;
  const from = { ...p.pos };
  const land = { x: tile.x, y: tile.y };
  engine.log(`🦖 ${p.name} ย่ำกระหม่อม`);
  engine.queueCutscene(p, CUT.stomp);
  engine.deferAfterCutscene(() => {
    if (!p.alive || !p.pos) return;
    const spot = engine.tileFree(land.x, land.y, p.id) ? land : p.pos;
    engine.rebaseMove(p);
    p.pos = { ...spot };
    const area = blastTiles(engine, spot);
    const keys = new Set(area.map((c) => K(c.x, c.y)));
    const foes = Object.values(engine.players).filter((u) => foe(engine, p, u)
      && Board.footprint(u.pos.x, u.pos.y, engine.sizeOf(u)).some((c) => keys.has(K(c.x, c.y))));
    fx(engine, p, "stomp", { from, to: { ...spot }, at: { ...spot }, radius: STOMP.radius });
    engine.skillBeat(T.stomp, () => {
      engine.hitArea(p, area, foes.map((u) => u.id));
      const hits = [];
      for (const t of foes) {
        if (!t.alive || !t.pos) continue;
        const short = Math.max(0, STOMP.drain - (t.skillPoints | 0));
        const at = { ...t.pos };
        const res = engine.withEffectSource(p, () => engine.skillStrike(p, t, "ย่ำกระหม่อม", { bonus: STOMP.dmg - 1 + short }));
        hits.push({ id: t.id, at, dodge: !!(res && res.dodge) });
        if (!res || res.dodge || res.blocked) continue;
        const took = drain(engine, p, t, STOMP.drain);
        if (took > 0 && t.pos) fx(engine, p, "drain", { at: { ...t.pos }, to: { ...p.pos }, targetId: t.id, n: took });
        if (!t.alive) continue;
        infect(engine, p, t, virusPerHit(engine, p));
        if (engine.withEffectSource(p, () => engine.applyDebuff(t, "rooted", 1, turnsFor(engine, t, 1)))) engine.log(`⛓️ ${t.name} ถูกตรึงตาเดินถัดไป`);
      }
      fx(engine, p, "stompHit", { at: { ...spot }, radius: STOMP.radius, hits });
    });
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, VOICE, STRIKE_VOICE, HP, ARMOR, MOV, MOV_HORSE, MOV_DINO, RANGE, HORSE, SCORN, POSSESS, SWARM, CHARGE, LEAP, STOMP,
  VIRUS, FRENZY, DINO, T, SKILLS,
  isMe, isDino, infect, stompTiles, blastTiles,

  resetCombat(p) { p.dino = isMe(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor(p) { return ARMOR + (isDino(p) ? DINO.armor : 0); },
  mov(p) {
    if (!isMe(p)) return null;
    if (isDino(p)) return MOV_DINO;
    return st(p).mounted && passiveOn(p) ? MOV_HORSE : MOV;
  },
  range(p) { return isMe(p) ? RANGE : null; },
  voiceLines(p) { return isMe(p) ? VOICE[isDino(p) ? "dino" : "human"] : null; },
  noItems(p) { return isDino(p); },
  // หมาก: ภาพเต็มตัว (คน/ไดโนเสาร์) · ขี่ม้า = หมากหกเหลี่ยม (ภาพปก)
  displayImg(p) { return isMe(p) ? IMG.cover : undefined; },

  // ---------- ตีปกติ ----------
  attackElement(engine, p) { return isMe(p) && passiveOn(p) ? "poison" : null; },
  // ท่าตีบนกระดาน (client dinoFx.js): ร่างคน = ตะปบข่วน · ร่างไดโนเสาร์ = งับแล้วข่วนซ้ำ (ผู้ใช้สั่ง 2026-11-18)
  attackStyle(p) { return isMe(p) ? (isDino(p) ? "dinoBite" : "dinoClaw") : null; },
  attackSound(p) {
    if (!isMe(p)) return undefined;
    if (st(p).clipStrike) return null; // คลิป skill3_hit แทน
    return isDino(p) ? SFX.bite : SFX.claw;
  },
  damageBonus(engine, attacker, target) {
    if (!isMe(attacker) || !markedBy(engine, attacker, target)) return 0;
    return SWARM.hit - 1;
  },
  onStrikeLanded(engine, attacker, target) {
    if (!isMe(attacker) || !target) return [];
    const out = [];
    if (markedBy(engine, attacker, target)) {
      st(attacker).clipStrike = true;
      if (target.alive) {
        engine.withEffectSource(attacker, () => {
          if (engine.applyPoison(target, SWARM.poison)) out.push("พิษร้าย");
          if (engine.applyBleed(target, SWARM.bleed) > 0) out.push("เลือดไหล");
        });
      }
    }
    if (target.alive && infect(engine, attacker, target, virusPerHit(engine, attacker)) > 0) out.push("ไวรัสบรรพกาล");
    return out;
  },
  // ตีแล้ว (โดน/หลบ) = ปลดตรึงของฝูงไดโนเสาร์
  onStrikeResolved(engine, attacker, target) {
    if (!isMe(attacker) || !target || !markedBy(engine, attacker, target)) return;
    target.dinoMark = null;
    if (target.statuses && target.statuses.rooted) target.statuses.rooted = 0;
  },
  preAttackClip(engine, attacker) {
    if (!isMe(attacker)) return null;
    const s = st(attacker);
    if (s.clipStrike) { s.clipStrike = false; return CUT.swarmHit; }
    const pool = STRIKE_VOICE[isDino(attacker) ? "dino" : "human"];
    engine.sfx(pool[Math.floor(Math.random() * pool.length)], null, { voice: attacker.id });
    return null;
  },

  // ---------- ม้า / การกลายพันธุ์ ----------
  absorbDamage(engine, p) { return isMe(p) && !isDino(p) && passiveOn(p) && Horse.absorb(engine, p, st(p), horseCfg); },
  hudActions(engine, p) {
    if (!isMe(p) || !p.alive) return undefined;
    const s = st(p);
    const horse = Horse.action(engine, p, s);
    const mutate = {
      key: "mutate", icon: s.form === "dino" ? "🧍" : "🦖", name: "การกลายพันธุ์", on: s.form === "dino", cd: 0,
      disabled: !canMutate(engine, p),
    };
    return [PassiveSeal.sealed(p) || s.form === "dino" ? { ...horse, disabled: true } : horse, mutate];
  },
  charAction(engine, p, key) {
    if (!isMe(p) || !p.alive || !p.pos) return false;
    if (key === "horse") return !isDino(p) && passiveOn(p) && Horse.toggle(engine, p, st(p), horseCfg);
    if (key !== "mutate" || !canMutate(engine, p)) return false;
    if (isDino(p)) { toHuman(engine, p, "toggle"); engine.broadcastState(); return true; }
    toDino(engine, p);
    return true;
  },
  // ต้นตาเดิน: ร่างไดโนเสาร์กินความบ้าคลั่ง 1 (ไม่พอ = คืนร่าง)
  onActorStart(engine, p) {
    if (!isDino(p)) return;
    const s = st(p);
    if (s.frenzy >= FRENZY.upkeep) { s.frenzy -= FRENZY.upkeep; return; }
    toHuman(engine, p, "upkeep");
  },
  // เกราะลด 1 (ทุกทาง) ระหว่างร่างไดโนเสาร์ = พลังชีวิต +1
  onArmorLost(engine, p) {
    if (!isDino(p) || !passiveOn(p) || !p.alive) return;
    engine.healHp(p, 1);
  },

  // ---------- สกิล ----------
  // ชื่อ/รูป/คำอธิบายตามร่าง (พื้นที่ = skillArea · ราคา = skillCost — view ทับ skillPub หลัง skillArea จึงไม่ส่ง area/cost ตรงนี้)
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    const { name, img, desc } = skillOf(p, tier);
    return { name, img, desc, flash: true };
  },
  skillCost(p, tier, base) { return isMe(p) ? skillOf(p, tier).cost : base; },
  skillArea(p, tier, area, opts, engine) {
    if (!isMe(p)) return area;
    const a = skillOf(p, tier).area;
    if (isDino(p) && tier === "ultimate") {
      const eng = engine || require("../server/engine").engine;
      return { ...a, range: eng.baseMovOf(p), tiles: stompTiles(eng, p) };
    }
    return a;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (!p.pos) return false;
    if (!isDino(p)) {
      if (tier === "basic") return true;
      if (tier === "secondary") {
        const t = engine.players[(targets || [])[0]];
        return !!t && foe(engine, p, t) && !t.summon && !t.duoOf && !t.duoWith && virusOf(t) >= POSSESS.need;
      }
      if (tier === "ultimate") return !s.mounted && cdLeft(s.swarmReady, r) === 0;
      return false;
    }
    if (tier === "basic" || tier === "secondary") return true;
    if (tier === "ultimate") return cdLeft(s.stompReady, r) === 0 && stompOk(engine, p, opts.tile);
    return false;
  },
  // ฉันจะฆ่าแก: ใช้แล้วยังเดินได้ (ผู้ใช้สั่ง)
  keepsMove(engine, p, tier) { return isMe(p) && !isDino(p) && tier === "ultimate"; },
  // ท่าพุ่ง/กระโดด/ฝูงไดโนเสาร์: ผลกับของบนพื้น (หนามน้ำแข็ง/ผนึก) ลงเองตามช่องที่โดนจริง (engine.hitArea)
  ownsAreaHit(p, tier) { return isMe(p) && (isDino(p) || tier === "ultimate"); },
  skillSound(p, tier) {
    if (!isMe(p)) return null;
    if (!isDino(p)) return tier === "basic" ? SFX.crack : tier === "secondary" ? SFX.possess : null;
    return tier === "basic" ? SFX.charge : null;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (!isDino(p)) {
      if (tier === "basic") { scorn(engine, p); return ""; }
      if (tier === "secondary") { const t = engine.players[(targets || [])[0]]; if (t) possess(engine, p, t); return ""; }
      if (tier === "ultimate") { swarm(engine, p, opts.dir); return ""; }
      return "";
    }
    if (tier === "basic") { charge(engine, p, opts.dir); return ""; }
    if (tier === "secondary") { leap(engine, p, opts.dir); return ""; }
    if (tier === "ultimate") { stomp(engine, p, opts.tile); return ""; }
    return "";
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    if (isDino(p)) {
      return { basic: { cd: 0, locked: false }, secondary: { cd: 0, locked: false }, ultimate: { cd: cdLeft(s.stompReady, r), locked: cdLeft(s.stompReady, r) > 0 } };
    }
    return {
      basic: { cd: 0, locked: false },
      secondary: { cd: 0, locked: false },
      ultimate: { cd: cdLeft(s.swarmReady, r), locked: s.mounted || cdLeft(s.swarmReady, r) > 0 },
    };
  },

  // ---------- จังหวะ ----------
  // ต้นเทิร์น: ร่างไดโนเสาร์ เกราะ +1
  onRoundStartTick(engine, p) {
    if (!isDino(p) || !passiveOn(p) || !p.alive) return;
    engine.healArmor(p, DINO.regen);
  },
  // ตาเดินที่ถูกควบคุมจบ = หมดผล (ระบบกลาง server/possess.js)
  afterActorEnd(engine, u) {
    const e = Possess.entryOf(u);
    if (!e || e.round !== engine.roundNumber) return;
    Possess.clear(u.id);
    const by = engine.players[e.by];
    engine.log(`🦖 ${u.name} หลุดจากการควบคุม${by ? `ของ ${by.name}` : ""}`);
    if (u.pos) engine.boardFx("dinoFx", { kind: "release", id: e.by, targetId: u.id, at: { ...u.pos } });
  },
  onEndTurn(engine) {
    Possess.sweep();
    const r = engine.roundNumber;
    for (const t of Object.values(engine.players)) {
      if (t.dinoMark && t.dinoMark.round <= r) t.dinoMark = null;
      const v = virusOf(t);
      if (v <= 0) continue;
      // ไม่ได้ไวรัสใหม่ครบ 3 เทิร์น = ลด 1 (แล้วนับใหม่)
      if (r - (t.dinoVirusAt || 0) >= VIRUS.life - 1) {
        t.statuses.dinoVirus = v - 1;
        t.dinoVirusAt = r + 1;
      }
    }
  },
  onDeath(engine, p) {
    if (!isMe(p)) return;
    for (const [id, e] of Object.entries((require("../server/match").possess) || {})) if (e.by === p.id) Possess.clear(id);
  },

  // ---------- ผลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.form === "dino") out.push({ key: "dinoForm", label: "ร่างไดโนเสาร์", at: s.formSever, cancel: () => toHuman(engine, p, "sever") });
    if (engine.roundNumber < s.scornEnd) out.push({ key: "dinoScorn", label: "อย่ามาดูถูกกันนะ", at: s.scornSever, cancel: () => { s.scornEnd = engine.roundNumber; } });
    const mine = Object.entries(require("../server/match").possess || {}).filter(([, e]) => e.by === p.id);
    if (mine.length) out.push({ key: "dinoPossess", label: "เข้าร่วมเผ่าพันธุ์", at: s.possessSever, cancel: () => { for (const [id] of mine) Possess.clear(id); } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  dinoState(engine, p, viewer) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const mine = !!viewer && viewer.id === p.id;
    return {
      form: s.form, frenzy: s.frenzy, frenzyMax: FRENZY.max, scorn: Math.max(0, s.scornEnd - r),
      swarmCd: cdLeft(s.swarmReady, r), stompCd: cdLeft(s.stompReady, r),
      standee: s.mounted ? null : s.form === "dino" ? IMG.full : IMG.half,
      possessing: mine ? Object.entries(require("../server/match").possess || {}).filter(([, e]) => e.by === p.id).map(([id]) => id) : undefined,
    };
  },
  // ม้าใต้หมาก (ใช้ตัววาดม้าของดิเอโก้ — client อ่าน players[].diego.mounted · ไม่มี ammo = ไม่ขึ้นแถบของร่างโลกคู่ขนาน)
  diegoState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    return { mounted: s.mounted, horseHp: s.horseHp, horseCd: Horse.cooldown(engine, s) };
  },
};

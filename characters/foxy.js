// ============================================================
//  ฟ็อกซี่ (Five Nights at Freddy's) — หมวดเอาฮา · id "foxy" — สเปกผู้ใช้ 2026-11-20 (GRID_PLAN §7.37)
//
//  HP 10 / เกราะ 5 · ตีประชิด [1, 1]
//  สกิลติดตัว 1987:
//    กลางวัน: ระยะเดิน 3 · พลังโจมตี 5 · ศัตรูเดินก่อนแล้วโจมตีโดน (ไม่หลบ) ก่อนฟ็อกซี่ได้เดินในเทิร์นนั้น = เสียตาเดินทั้งตาเทิร์นนั้น
//      (ฮุค onDamageDealt จด → skipsTurn ตอนถึงคิว · ฟ็อกซี่เดินไปแล้ว = ไม่มีผล)
//    กลางคืน: ระยะเดิน 9 · พลังโจมตี 3 · ไม่มีโทษโดนตีก่อน
//    แต้มสมอง 0–3 (เริ่ม 0): พุ่งโดนเป้า +1 · เต็ม 3 = การโจมตีปกติครั้งถัดไป (รวมท่าพุ่ง) ทำให้เป้าสตั้น 1 เทิร์น
//      + ลบแต้มสกิลเป้า 3 · มีไม่พอ = ส่วนต่างเป็นความเสียหายเพิ่ม (เกราะรับก่อน) · ใช้แล้วสมองกลับเป็น 0
//    เดินมีเสียงฝีเท้า (กลางวัน + กลางคืน — ไฟล์เดียวกับเฟรดดี้ ดันดังขึ้นที่ตัวไฟล์) · ปุ่ม HUD กล่องเพลง (sound_board — ดังมาก)
//    เข้ากลางคืน = คลิปเข้าช่วงกลางคืน ทุกคนเห็น ทุกครั้ง · PVE (Eos / Moon Cell / Road Trip) = กลางคืนตลอด
//    Nautilus: กลางวันจนถึงชั้น 6 (ทะเลข้อมูล) แล้วกลางคืนถาวร (ผู้ใช้สั่ง 2026-11-20)
//  สกิลพื้นฐาน ขอสักทีนะ ที่หน้า (2 แต้ม · คูลดาวน์ 1 เทิร์น): พุ่งแนวตรง 7×1 = การโจมตีปกติอีกรูปแบบ (ดาเมจ = พลังโจมตี · จบตาเดิน)
//    โดนศัตรูคนแรกแล้วหยุดหน้าเป้า · เป้าหลบได้ = พุ่งผ่านต่อ · ชนเพื่อนร่วมทีม/คนถัดไป = หยุดหน้า ไม่มีผล
//    พุ่งไม่โดนแล้วชนสิ่งกีดขวาง/ขอบแผนที่ = หยุดตรงนั้น สตั้นตัวเอง 1 เทิร์น (ผู้ใช้สั่ง 2026-11-20)
//
//  การตัดสินของ Claude (ผู้ใช้ไม่ได้ระบุ):
//    "ถูกโจมตี" = ศัตรูทำให้เสียพลังชีวิต/เกราะ/โล่จริงระหว่างตาเดินของศัตรู (ผลต้นเทิร์น เช่น ลุกไหม้ ไม่นับ) · โดนหลายครั้งเสียแค่ตาเดียว
//    ลบแต้มสกิลเป้า = หายไป ไม่เข้าตัวฟ็อกซี่ · ตีที่ใช้สมองเต็มไม่ได้ +1 เพิ่ม · หลบพ้น/ถูกกัน = สมองยังเต็ม (ไม่เสีย)
//    สตั้นตัวเองจากท่าพุ่ง = เต็มเทิร์นถัดไป (ใส่ตอน onEndTurn) · ชน "คนที่สอง" หลังเป้าหลบ = หยุดหน้าคนนั้น ไม่สตั้น
//    ท่าพุ่งไม่คิดคริติคอล (ผ่าน engine.skillStrike) · ปุ่มกล่องเพลง 1 ครั้งต่อเทิร์น กดได้ทุกช่วง (ไม่ต้องเป็นตาตัวเอง) ยกเว้นระหว่างคลิป
//    ลบสกิลติดตัว: ระยะเดิน/พลังโจมตีตามช่วงเวลายังอยู่ (ค่าพื้นฐานของตัว) · ปิดโทษโดนตีก่อน + แต้มสมอง
//  สื่อ: ผู้ใช้ส่งมา (Downloads/foxy — 2026-11-20) · hit.webm = hit.mp4 ตัดฉากเขียว (VP9 alpha — คลิปพื้นใส `clear`)
//    brain_hit.mp4 = brain_max_hit.mp4 ตัดแถบลายน้ำด้านบน · night.mp4 = เมื่อเข้าช่วงกลางคืน.mp4 (crf 23)
// ============================================================

const PassiveSeal = require("../server/passiveSeal");

const ID = "foxy";
const DIR = "/characters/foxy";
const IMG = { card: `${DIR}/foxy.webp`, token: `${DIR}/foxy_model.webp`, skill: `${DIR}/skill1.webp` };
const VIDEO = { hit: `${DIR}/hit.webm`, brain: `${DIR}/brain_hit.mp4`, night: `${DIR}/night.mp4` };
const CUT = { hit: "foxyHit", brain: "foxyBrain", night: "foxyNight" };
// คีย์ใน client/src/audio.js (ไฟล์ client/public/characters/foxy/sfx/)
const SFX = { steps: "foxy_steps", board: "foxy_board" };
const MOV = { day: 3, night: 9 };
const ATK = { day: 5, night: 3 };
const DASH = { len: 7, cd: 1, name: "ขอสักทีนะ ที่หน้า" };
const BRAIN = { max: 3, drain: 3, stun: 1 };
const STEP_MS = 70; // เวลาต่อช่องของแอนิเมชันพุ่ง (client setDash)
const DATA_STAGE = 12; // Nautilus ชั้น 6 (server/fodlan/nautilusLayer.js DATA_STAGE)

function eng() { return require("../server/engine").engine; }
const isFoxy = (p) => !!p && p.characterId === ID && !p.summon;
const fresh = () => ({ brain: 0, dashReady: 0, skipRound: -1, stunNext: false, wasNight: false, stepKey: null, boardRound: -1, clipBrain: false });
const st = (p) => p.foxy || (p.foxy = fresh());
const foe = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t);
const nextTurnSpan = (engine, t, n = 1) => n + ((engine.hasActed(t.id) || engine.actorId === t.id) ? 1 : 0);

function pveMode() { const M = require("../server/pveMode"); return M.isPveCoop() || M.isMoon(); }
function nautilusNight() {
  const F = require("../server/fodlan");
  return F.isNautilus() ? F.stageNow() >= DATA_STAGE : null;
}
// กลางคืนของฟ็อกซี่: Nautilus = ชั้น 6 ขึ้นไป · PVE = ตลอด · ที่อื่นตามวงจรกลางวัน/กลางคืน
function nightNow(engine) {
  const n = nautilusNight();
  if (n !== null) return n;
  return pveMode() || !!engine.isNightRound(engine.roundNumber);
}

// ---------- แต้มสมอง ----------
const brainFull = (p) => PassiveSeal.on(p) && st(p).brain >= BRAIN.max;
function addBrain(engine, p) {
  if (!PassiveSeal.on(p)) return;
  const s = st(p);
  if (s.brain >= BRAIN.max) return;
  s.brain += 1;
  engine.log(`🧠 ${p.name} แต้มสมอง ${s.brain}/${BRAIN.max}`);
}
// สมองเต็ม: สตั้นเป้า 1 เทิร์น + ลบแต้มสกิล 3 · ขาด = ความเสียหายเพิ่มเท่าส่วนต่าง (เกราะรับก่อน · ผู้เรียกเช็คตายเอง)
function brainBurst(engine, p, t) {
  const s = st(p);
  s.brain = 0;
  const take = Math.max(0, Math.min(BRAIN.drain, t.skillPoints | 0));
  t.skillPoints -= take;
  const short = BRAIN.drain - take;
  if (short > 0 && t.alive) engine.dealMixed(t, short, false);
  const stun = t.alive && engine.applyDebuff(t, "stun", null, nextTurnSpan(engine, t, BRAIN.stun));
  engine.log(`🧠 ${p.name} สมองเต็ม → ${t.name}${stun ? " สตั้น" : ""} · แต้มสกิล -${take}${short > 0 ? ` · ความเสียหายเพิ่ม ${short}` : ""}`);
  return short;
}

// ---------- ท่าพุ่ง ----------
// แผนการพุ่ง: ช่องที่ผ่าน (path จากช่องเริ่ม) · ช่องลง · เป้าที่โดน · ต้องสตั้นตัวเองไหม
function planDash(engine, p, dir) {
  const tiles = engine.chargeTiles(p, dir, DASH.len);
  const path = [{ ...p.pos }];
  let land = 0, hit = null, stun = false, tried = false, stopped = false;
  const dodged = [];
  for (const c of tiles) {
    if (c.obstacle || c.shop) { stun = !hit; stopped = true; break; }
    const u = c.unitId ? engine.players[c.unitId] : null;
    if (u) {
      if (!tried && foe(engine, p, u)) {
        tried = true;
        if (!engine.withEffectSource(p, () => engine.skillDodge(p, u, DASH.name))) { hit = u; stopped = true; break; }
        dodged.push(u.id); // หลบได้ = พุ่งผ่านต่อ (ลงช่องนี้ไม่ได้)
        path.push({ x: c.x, y: c.y });
        continue;
      }
      stopped = true; // เพื่อนร่วมทีม / คนที่สอง = หยุดหน้า ไม่มีผล
      break;
    }
    path.push({ x: c.x, y: c.y });
    land = path.length - 1;
  }
  // ชนขอบแผนที่ก่อนครบระยะ (ไม่โดนใคร) = สตั้น
  if (!stopped && !hit && tiles.length < DASH.len) stun = true;
  return { tiles, path: path.slice(0, land + 1), passed: path, land: path[land], hit, stun, dodged };
}

function dash(engine, p, dir) {
  const s = st(p);
  s.dashReady = engine.roundNumber + DASH.cd + 1;
  const from = { ...p.pos };
  const plan = planDash(engine, p, dir);
  const burst = !!plan.hit && brainFull(p);
  if (plan.land.x !== from.x || plan.land.y !== from.y) {
    engine.rebaseMove(p);
    p.pos = { ...plan.land };
  }
  // แอนิเมชันวิ่งไปถึงช่องลง (ผ่านคนที่หลบ) · โดนเป้า = หยุดหน้าเป้า
  engine.setDash({ id: p.id, path: plan.path });
  const reached = plan.tiles.slice(0, Math.max(0, plan.passed.length - 1) + (plan.hit || plan.stun ? 1 : 0));
  engine.hitArea(p, reached.map((c) => ({ x: c.x, y: c.y })), plan.hit ? [plan.hit.id] : []);
  for (const id of plan.dodged) engine.log(`💨 ${engine.players[id].name} หลบ${DASH.name}ของ ${p.name}`);
  if (plan.stun) { s.stunNext = true; engine.log(`💥 ${p.name} พุ่งชน — สตั้นตัวเอง`); }
  const secs = Math.max(0.35, (plan.path.length - 1) * STEP_MS / 1000 + 0.25);
  engine.skillBeat(secs, () => {
    const t = plan.hit;
    if (!t || !t.alive || !t.pos || !p.alive) return;
    engine.queueCutscene(p, burst ? CUT.brain : CUT.hit);
    engine.deferAfterCutscene(() => strikeDash(engine, p, t, burst));
  });
}
function strikeDash(engine, p, t, burst) {
  if (!t.alive || !t.pos || !p.alive) return;
  engine.withEffectSource(p, () => {
    const res = engine.skillStrike(p, t, DASH.name, { sure: true });
    if (!res || res.blocked || res.dodge) return;
    if (burst && t.alive && brainFull(p)) {
      brainBurst(engine, p, t);
      if (t.alive && t.hp <= 0) engine.instantDeath(t);
      if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} ตกรอบ!`); }
    } else if (!burst) addBrain(engine, p);
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, MOV, ATK, DASH, BRAIN,
  isFoxy, nightNow, planDash,

  resetCombat(p) { p.foxy = isFoxy(p) ? fresh() : null; },

  mov(p) { return isFoxy(p) ? (nightNow(eng()) ? MOV.night : MOV.day) : null; },
  attackBaseOverride(engine, attacker) {
    if (!isFoxy(attacker)) return 1;
    return nightNow(engine) ? ATK.night : ATK.day;
  },

  // ---------- กลางวัน: ศัตรูโจมตีโดนก่อนฟ็อกซี่ได้เดิน = เสียตาเดินเทิร์นนี้ ----------
  onDamageDealt(engine, src, victim) {
    if (!isFoxy(victim) || !victim.alive || !src || src.id === victim.id || engine.sameTeam(src, victim)) return;
    if (!PassiveSeal.on(victim) || nightNow(engine)) return;
    const actor = engine.actorId ? engine.players[engine.actorId] : null;
    if (!actor || actor.id === victim.id || engine.sameTeam(actor, victim) || engine.hasActed(victim.id)) return;
    const s = st(victim);
    if (s.skipRound === engine.roundNumber) return;
    s.skipRound = engine.roundNumber;
    engine.log(`🦊 ${victim.name} โดนโจมตีก่อน — เสียตาเดินเทิร์นนี้`);
  },
  skipsTurn(engine, u) {
    if (!isFoxy(u) || st(u).skipRound !== engine.roundNumber) return false;
    engine.log(`🦊 ${u.name} ข้ามตาเดิน`);
    return true;
  },

  // ---------- สกิลพื้นฐาน: ขอสักทีนะ ที่หน้า ----------
  canUseSkill(engine, p, tier) {
    if (!isFoxy(p) || tier !== "basic") return true;
    return engine.roundNumber >= st(p).dashReady && !!p.pos;
  },
  ownsAreaHit(p, tier) { return isFoxy(p) && tier === "basic"; },
  endsTurn(engine, p, tier) { return isFoxy(p) && tier === "basic"; },
  skillSound(p, tier) { return isFoxy(p) && tier === "basic" ? null : undefined; }, // โดน = คลิป (ห้ามเสียงซ้อนคลิป)
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isFoxy(p) || tier !== "basic" || !p.pos) return;
    dash(engine, p, opts.dir);
  },
  skillLocks(engine, p) {
    if (!isFoxy(p)) return undefined;
    const cd = Math.max(0, st(p).dashReady - engine.roundNumber);
    return { basic: { cd, locked: cd > 0 } };
  },

  // ---------- ตีปกติ: คลิปทุกครั้ง (hit พื้นใส / สมองเต็ม) · สมองเต็ม = สตั้น + ลบแต้มสกิล ----------
  //  ฮุคนี้ถูกเรียกหลังคิดผลตีแล้ว (สมองถูกใช้ไปใน onStrikeLanded) → อ่านธง clipBrain ที่จดไว้
  preAttackClip(engine, p, card) {
    if (!isFoxy(p)) return null;
    const s = st(p), brain = s.clipBrain;
    s.clipBrain = false;
    if (card && card.dodge) return null;
    return brain ? CUT.brain : CUT.hit;
  },
  onStrikeLanded(engine, attacker, target, { counter } = {}) {
    if (!isFoxy(attacker) || counter || !brainFull(attacker) || !target.alive) return [];
    brainBurst(engine, attacker, target); // ตายจากส่วนต่าง: strike() เช็คต่อให้
    st(attacker).clipBrain = true;
    return ["สมองเต็ม"];
  },

  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isFoxy(p) || !p.foxy || !p.foxy.stunNext) continue;
      p.foxy.stunNext = false;
      if (p.alive) engine.applyBuff(p, "stun", null, 1); // โทษของตัวเอง: ไม่ทอยต้าน · หลังลูปลดเทิร์น = เต็มเทิร์นถัดไป
    }
  },
  // เข้ากลางคืน: คลิปให้ทุกคนดู (ครั้งเดียวต่อการเปลี่ยน แม้มีฟ็อกซี่หลายตัว)
  onRoundDealt(engine) {
    const fs = Object.values(engine.players).filter((p) => isFoxy(p) && p.alive);
    if (!fs.length) return;
    const night = nightNow(engine);
    let play = false;
    for (const f of fs) { if (night && !st(f).wasNight) play = true; st(f).wasNight = night; }
    if (play) engine.queueCutscene(fs[0], CUT.night);
  },
  // เดินมีเสียงฝีเท้า (ทุกคนได้ยิน · ครั้งเดียวต่อตาเดิน) — afterWalk ถูกเรียกใหม่ทุกก้าว
  afterWalk(engine, p) {
    if (!isFoxy(p)) return undefined;
    const s = st(p), key = `${engine.roundNumber}`;
    if (s.stepKey === key) return undefined;
    s.stepKey = key;
    engine.sfx(SFX.steps);
    return undefined;
  },
  // ปุ่ม HUD: กล่องเพลง (กดได้ทุกช่วง 1 ครั้งต่อเทิร์น) · แต้มสมอง (แสดงเฉยๆ)
  hudActions(engine, p) {
    if (!isFoxy(p) || !p.alive) return undefined;
    const s = st(p);
    return [
      { key: "board", icon: "🎵", name: "กล่องเพลง", row: "foxy", on: false, cd: 0, disabled: s.boardRound === engine.roundNumber },
      { key: "brain", icon: "🧠", name: `${s.brain}/${BRAIN.max}`, row: "foxy", on: s.brain >= BRAIN.max, cd: 0, disabled: true },
    ];
  },
  charAction(engine, p, key) {
    if (!isFoxy(p) || key !== "board" || !p.alive || engine.gameState === "CUTSCENE") return false;
    const s = st(p);
    if (s.boardRound === engine.roundNumber) return false;
    s.boardRound = engine.roundNumber;
    engine.sfx(SFX.board, null, { voice: `foxy:${p.id}` });
    engine.broadcastState();
    return true;
  },
  severables() { return []; },
  foxyState(engine, p) {
    if (!isFoxy(p)) return undefined;
    return { night: nightNow(engine), standee: IMG.token, brain: st(p).brain };
  },
};

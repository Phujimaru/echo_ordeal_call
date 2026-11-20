// นารุโฮโดะ ริวอิจิ — ทนายความ (GRID_PLAN §7.38 · สัญญา .claude/plans/naruhodo-contract.md · GAME_SYSTEM §62)
//  ระบบศาล/บันทึกเหตุการณ์/รอเดี๋ยว!!! อยู่ที่ server/court.js (engine.court) — ไฟล์นี้คือฮุคตัวละคร
//  basic แลกข้อมูล (ผู้ใช้อนุมัติ 2026-11-21 แทน เอานี่ไปดู!): ฟรี · คูลดาวน์ 2 · ต้องมีหลักฐานในแฟ้ม — ทิ้งหลักฐาน 1 ชิ้นแลกรางวัล 1 อย่าง:
//   แต้มสกิล +2 / พลังชีวิต +1 / คูลดาวน์ รอเดี๋ยว!!! −1 · ปุ่มหลายตัวเลือก (skillPub choices — key "<evId>|<sp|hp|hold>") · กินโควตา + ล็อกการเดินแบบสกิลปกติ
//  secondary สืบสวน (ระยะ 4 · หลักฐาน +1 · เห็นทะลุล่องหน/พุ่ม + คูลดาวน์ของเป้าจนจบเทิร์นหน้า · คูลดาวน์ 2)
//  ultimate เริ่มการไต่สวน (ระยะ 5 · หลบได้ · โดน = ศาล · คูลดาวน์ 5 นับหลังคดีจบ)
//  passive รอเดี๋ยว!!! (socket holdIt — แทรกตาศัตรูในระยะ 4 · คูลดาวน์ 3 · ตาหน้าเดินไม่ได้ · ปิดด้วยลบสกิลติดตัว)
const Board = require("../server/board");
const PassiveSeal = require("../server/passiveSeal");

const ID = "naruhodo_ryuichi";
const DIR = "/characters/naruhodo_ryuichi";
const IMG = { trade: `${DIR}/skill1.webp`, scout: `${DIR}/skill2.webp`, trial: `${DIR}/skill3.webp` };
const NAME = { trade: "แลกข้อมูล", scout: "สืบสวน", trial: "เริ่มการไต่สวน", hold: "รอเดี๋ยว!!!" };
//  เสียง: แลกข้อมูล = เสียงแฟ้ม (naru_scout) · สืบสวน = ชี้นิ้ว (naru_point — ภาพชี้นิ้ว skill2) · ท่าไม้ตาย = เปิดศาล
const SFX = { trade: "naru_scout", scout: "naru_point", trial: "naru_trial_open" };
const TRADE = { cd: 2, sp: 2, hp: 1, holdCut: 1 };
const REWARDS = {
  sp: { name: "แต้มสกิล +2", desc: "แต้มสกิล +2" },
  hp: { name: "พลังชีวิต +1", desc: "พลังชีวิต +1" },
  hold: { name: "รอเดี๋ยว!!! −1", desc: "คูลดาวน์ รอเดี๋ยว!!! −1 เทิร์น" },
};
const SCOUT = { cd: 2 };
const ULT = { get cd() { return require("../server/court").RULES.ultCd; } }; // คูลดาวน์นับหลังคดีจบ (2026-11-21: 2)

const C = () => require("../server/court");
const isMe = (p) => !!p && !p.summon && p.characterId === ID;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const st = (p) => C().st(p);
const foe = (engine, p, t) => !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);

// ศัตรูคนแรกในแนว (ใกล้สุดตามทิศ · เท่ากัน = ใกล้แนวกลาง)
function firstFoe(engine, p, targets, dir) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !p.pos) return null;
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => foe(engine, p, t) && t.pos);
  const along = (t) => {
    const dx = Board.wdx ? Board.wdx(p.pos.x, t.pos.x) : t.pos.x - p.pos.x, dy = t.pos.y - p.pos.y;
    return { a: dx * v[0] + dy * v[1], s: Math.abs(dx * -v[1] + dy * v[0]) };
  };
  const best = foes.map((t) => ({ t, ...along(t) })).sort((x, y) => x.a - y.a || x.s - y.s || (x.t.id < y.t.id ? -1 : 1))[0];
  return best ? best.t : null;
}
const tileOf = (u) => (u && u.pos ? { x: u.pos.x, y: u.pos.y } : null);

// แลกข้อมูล: form = "<evId>|<sp|hp|hold>" — ทิ้งหลักฐานชิ้นนั้น (ใช้ในศาลไม่ได้อีก) แล้วรับรางวัล
function parseTrade(p, form) {
  const [evId, reward] = String(form || "").split("|");
  const ev = C().liveEvidence(p).find((e) => e.id === evId);
  return ev && REWARDS[reward] ? { ev, reward } : null;
}
function tradeLocked(engine, p, reward) {
  const s = st(p);
  if (reward === "sp") return p.skillPoints >= engine.maxSkillOf(p);
  if (reward === "hp") return p.hp >= engine.maxHpOf(p);
  if (reward === "hold") return (s.holdReady || 0) <= engine.roundNumber;
  return true;
}
function tradeChoices(engine, p) {
  const out = [];
  for (const ev of C().liveEvidence(p)) {
    for (const [k, r] of Object.entries(REWARDS)) {
      out.push({
        key: `${ev.id}|${k}`, name: `${ev.name} → ${r.name}`, img: IMG.trade, cost: 0, area: { kind: "self" },
        evId: ev.id, evIcon: ev.icon, evName: ev.name, reward: k, rewardName: r.name, locked: tradeLocked(engine, p, k),
        desc: `ทิ้ง ${ev.name} (${ev.desc}) แลก ${r.desc}`,
      });
    }
  }
  return out;
}
function castTrade(engine, p, form) {
  const t = parseTrade(p, form);
  if (!t) return "";
  const s = st(p);
  s.tradeReady = engine.roundNumber + TRADE.cd;
  t.ev.used = true; // ทิ้งจากแฟ้ม
  s.evidence = s.evidence.filter((e) => !e.used);
  let got = 0;
  if (t.reward === "sp") { const b = p.skillPoints; engine.addSkill(p, TRADE.sp, "naruhodo"); got = p.skillPoints - b; }
  else if (t.reward === "hp") got = engine.healHp(p, TRADE.hp) || 0;
  else if (t.reward === "hold") { const b = s.holdReady || 0; s.holdReady = Math.max(engine.roundNumber, b - TRADE.holdCut); got = b - s.holdReady; }
  engine.boardFx("naruhodoScout", { kind: "trade", id: p.id, by: p.id, from: tileOf(p), icon: t.ev.icon, reward: t.reward, amount: got });
  engine.log(`📁 ${p.name} ${NAME.trade} — ทิ้ง ${t.ev.name} → ${REWARDS[t.reward].name}`);
  return ` — ${REWARDS[t.reward].name}`;
}
function castScout(engine, p, targets) {
  const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u));
  if (!t) return "";
  const court = C(), s = st(p);
  const held = new Set(s.evidence.map((e) => e.evKey));
  const ev = court.lastEventOf(court.actorOf(t).id, held);
  const got = ev ? court.addEvidence(p, ev) : court.noteEvidence(p, t);
  s.scout = { targetId: t.id, until: engine.roundNumber + 1, at: engine.severStamp() };
  s.scoutReady = engine.roundNumber + SCOUT.cd;
  engine.boardFx("naruhodoScout", { kind: "scout", id: p.id, by: p.id, targetId: t.id, from: tileOf(p), to: tileOf(t), icon: got ? got.icon : null });
  engine.log(`🔍 ${p.name} ${NAME.scout} ${t.name}${got ? ` — ได้ ${got.name}` : ""}`);
  return got ? ` — ${got.name}` : "";
}
function castTrial(engine, p, targets) {
  const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u));
  if (!t) return "";
  const s = st(p);
  engine.boardFx("naruhodoTrial", { kind: "cast", id: p.id, by: p.id, targetId: t.id, from: tileOf(p), to: tileOf(t) });
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, NAME.trial)) {
    s.ultReady = engine.roundNumber + ULT.cd;
    engine.boardFx("naruhodoTrial", { kind: "dodge", id: p.id, by: p.id, targetId: t.id, to: tileOf(t) });
    return " — หลบ";
  }
  const block = engine.attackBlocked ? engine.attackBlocked(t, p) : null;
  if (block) { s.ultReady = engine.roundNumber + ULT.cd; engine.log(`🛡️ ${t.name} ${block.name} — กัน${NAME.trial}`); return ""; }
  engine.boardFx("naruhodoTrial", { kind: "open", id: p.id, by: p.id, targetId: t.id, from: tileOf(p), to: tileOf(t) });
  if (!engine.court.start(p, t)) s.ultReady = engine.roundNumber + ULT.cd;
  return "";
}

module.exports = {
  id: ID,
  IMG, NAME, SFX, TRADE, REWARDS, SCOUT, ULT, isMe, firstFoe, tradeChoices,

  resetCombat(p) {
    p.courtAlibi = 0; // ข้อแก้ตัว (ทุกคน — มีผลเฉพาะแมตช์ที่มีนารุโฮโดะ)
    p.naruhodo = isMe(p) ? C().fresh() : null;
  },

  // ---------- สกิล ----------
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const sc = cdLeft(s.scoutReady, r);
    const inCourt = !!require("../server/match").court;
    const ult = s.ultReady >= Number.MAX_SAFE_INTEGER ? 0 : cdLeft(s.ultReady, r);
    return {
      basic: { cd: cdLeft(s.tradeReady, r), locked: cdLeft(s.tradeReady, r) > 0 || !C().liveEvidence(p).length },
      secondary: { cd: sc, locked: sc > 0 },
      ultimate: { cd: ult, locked: ult > 0 || inCourt || s.ultReady >= Number.MAX_SAFE_INTEGER },
    };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    const m = require("../server/match");
    if (engine.action && engine.action.holdIt) return false;
    if (tier === "basic") { // แลกข้อมูล: ต้องมีหลักฐาน · ไม่ใช่ระหว่างคดี/ตาแทรก · ตัวเลือกถูกต้องและได้ผลจริง
      if (cdLeft(s.tradeReady, r) > 0 || m.court || m.holdIt) return false;
      const t = parseTrade(p, opts.form);
      return !!t && !tradeLocked(engine, p, t.reward);
    }
    const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u));
    if (!t) return false;
    if (tier === "secondary") return cdLeft(s.scoutReady, r) === 0;
    if (tier === "ultimate") {
      if (cdLeft(s.ultReady, r) > 0 || m.court || m.holdIt) return false;
      const f = engine.timeStop.frozen();
      if (f && f.by !== p.id) return false; // หยุดเวลาของคนอื่นอยู่
      if (engine.clockUp.active()) return false;
      return true;
    }
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (tier === "basic") return castTrade(engine, p, opts.form);
    if (tier === "secondary") return castScout(engine, p, targets);
    if (tier === "ultimate") return castTrial(engine, p, targets);
    return "";
  },
  skillSound(p, tier) {
    if (!isMe(p)) return null;
    return tier === "basic" ? SFX.trade : tier === "secondary" ? SFX.scout : tier === "ultimate" ? SFX.trial : null;
  },
  // ปุ่มแลกข้อมูล = ปุ่มหลายตัวเลือก (หลักฐาน × รางวัล)
  skillPub(p, tier) {
    if (!isMe(p) || tier !== "basic") return null;
    return { choices: tradeChoices(require("../server/engine").engine, p) };
  },
  attackElement() { return null; },
  skillElement() { return null; },

  // ---------- ศาล: เพลง ----------
  skillMusic(engine, p) {
    const m = require("../server/match");
    const c = m.court;
    if (!c || !p || c.lawyerId !== p.id || !c.music) return null;
    return { music: `naru_bgm_${c.music}`, at: c.musicAt || 0 };
  },

  // ---------- รอเดี๋ยว!!! ----------
  onExtraTurn(engine, p, kind) {
    if (isMe(p) && kind === "holdIt") C().holdStart(p);
  },
  clockSeconds(engine, p) { return isMe(p) ? C().holdClock(p) : 0; },
  onActorEnd(engine, p) {
    if (!isMe(p)) return;
    if (engine.action && engine.action.extra === "holdIt") C().holdEnded(p);
  },
  // ตาเดินถัดไปหลังกดรอเดี๋ยว!!! = เดินไม่ได้
  onActorReady(engine, p) {
    if (!isMe(p) || !p.naruhodo || !p.naruhodo.noMoveNext || !engine.action || engine.action.extra) return;
    p.naruhodo.noMoveNext = false;
    engine.action.locked = true;
    engine.log(`✋ ${p.name} ใช้ ${NAME.hold} ไปแล้ว — ตานี้เดินไม่ได้`);
  },
  // บันทึกการเดินไกล ≥ 3 ช่องของทุกคน (ฮุค broadcast)
  afterActorEnd(engine, p) {
    if (p && p.alive) C().noteMove(p);
    return 0;
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.naruhodo) continue;
      const s = p.naruhodo;
      if (s.scout && engine.roundNumber >= s.scout.until) s.scout = null;
      if (s.objection && engine.roundNumber >= s.objection.round) s.objection = null;
    }
  },
  onDeath(engine, dead) {
    const m = require("../server/match");
    if (m.holdIt && m.holdIt.actorId === dead.id && m.holdIt.phase === "alibi") m.holdIt.alibiUsed = false;
  },

  // ---------- ผลค้างที่ตัดได้ (server/sever.js) — ศาลที่กำลังพิจารณาไม่ถูกตัด ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive || !p.naruhodo) return [];
    const s = p.naruhodo, r = engine.roundNumber, out = [];
    if (s.scout && r <= s.scout.until) out.push({ key: "scout", label: NAME.scout, at: s.scout.at, cancel: () => { s.scout = null; } });
    if (s.noMoveNext) out.push({ key: "hold", label: NAME.hold, at: s.holdSever, cancel: () => { s.noMoveNext = false; } });
    if (s.objection && s.objection.round === r) {
      out.push({
        key: "objection", label: NAME.hold, at: s.objection.at,
        cancel: () => {
          const t = engine.players[s.objection.targetId];
          if (t && t.statuses) delete t.statuses.naruhodoObjected;
          if (t && engine.actorId === t.id && engine.action) { engine.action.noSkill = false; engine.action.noStrike = false; }
          s.objection = null;
        },
      });
    }
    return out;
  },

  // ---------- ข้อมูลให้ client (state.players[].naruhodo) ----------
  naruhodoState(engine, p, mine) {
    if (!isMe(p) || !p.naruhodo) return undefined;
    const court = C();
    const holdReady = court.canHold(p);
    if (!mine) return { holdReady };
    const s = p.naruhodo, r = engine.roundNumber;
    let scout = null;
    if (s.scout && r <= s.scout.until) {
      const t = engine.players[s.scout.targetId];
      const hook = t && engine.CHAR_HOOKS[t.characterId];
      const locks = hook && hook.skillLocks ? hook.skillLocks(engine, t, p) || {} : {};
      const cds = {};
      for (const k of ["basic", "secondary", "ultimate"]) cds[k] = locks[k] ? locks[k].cd || 0 : 0;
      scout = { targetId: s.scout.targetId, until: s.scout.until, cds };
    }
    return {
      evidence: court.liveEvidence(p), holdCd: cdLeft(s.holdReady, r), holdReady, noMoveNext: !!s.noMoveNext, scout,
      sealed: !PassiveSeal.on(p),
    };
  },
};

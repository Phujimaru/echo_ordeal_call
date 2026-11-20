// นารุโฮโดะ ริวอิจิ — ทนายความ (GRID_PLAN §7.38 · สัญญา .claude/plans/naruhodo-contract.md · GAME_SYSTEM §62)
//  ระบบศาล/บันทึกเหตุการณ์/รอเดี๋ยว!!! อยู่ที่ server/court.js (engine.court) — ไฟล์นี้คือฮุคตัวละคร
//  basic เอานี่ไปดู! (แนว 3×1 ศัตรูคนแรก −1 · มีหลักฐานของคนนั้น ใช้ 1 ชิ้น = −3 · หลบได้)
//  secondary สืบสวน (ระยะ 4 · หลักฐาน +1 · เห็นทะลุล่องหน/พุ่ม + คูลดาวน์ของเป้าจนจบเทิร์นหน้า · คูลดาวน์ 2)
//  ultimate เริ่มการไต่สวน (ระยะ 5 · หลบได้ · โดน = ศาล · คูลดาวน์ 5 นับหลังคดีจบ)
//  passive รอเดี๋ยว!!! (socket holdIt — แทรกตาศัตรูในระยะ 4 · คูลดาวน์ 3 · ตาหน้าเดินไม่ได้ · ปิดด้วยลบสกิลติดตัว)
const Board = require("../server/board");
const PassiveSeal = require("../server/passiveSeal");

const ID = "naruhodo_ryuichi";
const DIR = "/characters/naruhodo_ryuichi";
const IMG = { scout: `${DIR}/skill1.webp`, point: `${DIR}/skill2.webp`, trial: `${DIR}/skill3.webp` };
const NAME = { point: "เอานี่ไปดู!", scout: "สืบสวน", trial: "เริ่มการไต่สวน", hold: "รอเดี๋ยว!!!" };
const SFX = { point: "naru_point", scout: "naru_scout", trial: "naru_trial_open" };
const POINT = { dmg: 1, evDmg: 3 };
const SCOUT = { cd: 2 };
const ULT = { cd: 5 };

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

function castPoint(engine, p, targets, dir) {
  const t = firstFoe(engine, p, targets, dir);
  if (!t) return "";
  const court = C();
  const ev = court.liveEvidence(p).filter((e) => e.actorId === court.actorOf(t).id).pop() || null;
  engine.boardFx("naruhodoPoint", { kind: "point", id: p.id, by: p.id, targetId: t.id, from: tileOf(p), to: tileOf(t), dir, icon: ev ? ev.icon : null, evName: ev ? ev.name : null });
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, NAME.point)) return " — หลบ";
  const block = engine.attackBlocked ? engine.attackBlocked(t, p) : null;
  if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${NAME.point}ของ ${p.name}`); return ""; }
  const n = ev ? POINT.evDmg : POINT.dmg;
  if (ev) ev.used = true; // ใช้หลักฐานเมื่อโดนจริงเท่านั้น
  engine.dealMixed(t, n, false);
  engine.log(`☝️ ${p.name} ${NAME.point}${ev ? ` (${ev.name})` : ""} → ${t.name} -${n} (ลดเกราะก่อน)`);
  if (t.alive && t.hp <= 0) {
    engine.instantDeath(t);
    if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
  }
  if (!t.alive) t.pos = null;
  return ev ? ` — ${ev.name}` : "";
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
  IMG, NAME, SFX, POINT, SCOUT, ULT, isMe, firstFoe,

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
      basic: { cd: 0, locked: false },
      secondary: { cd: sc, locked: sc > 0 },
      ultimate: { cd: ult, locked: ult > 0 || inCourt || s.ultReady >= Number.MAX_SAFE_INTEGER },
    };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    const m = require("../server/match");
    if (engine.action && engine.action.holdIt) return false;
    if (tier === "basic") return !!firstFoe(engine, p, targets, opts.dir);
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
    if (tier === "basic") return castPoint(engine, p, targets, opts.dir);
    if (tier === "secondary") return castScout(engine, p, targets);
    if (tier === "ultimate") return castTrial(engine, p, targets);
    return "";
  },
  skillSound(p, tier) {
    if (!isMe(p)) return null;
    return tier === "basic" ? SFX.point : tier === "secondary" ? SFX.scout : tier === "ultimate" ? SFX.trial : null;
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

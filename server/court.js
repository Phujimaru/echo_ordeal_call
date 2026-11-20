// ============================================================
//  ศาลของนารุโฮโดะ ริวอิจิ — ระบบกลาง (GRID_PLAN §7.38 · GAME_SYSTEM §62 · สัญญา .claude/plans/naruhodo-contract.md)
//   1. บันทึกเหตุการณ์ (match.courtLog) → หลักฐาน (p.naruhodo.evidence) / ข้อแก้ตัว (p.courtAlibi) / การเห็นของทุกคน (ev.seenBy)
//      ทำงานเฉพาะแมตช์ที่มีนารุโฮโดะ (รวม Echo สวมร่าง — characterId)
//   2. ศาล (match.court): พักทั้งเกมด้วยจังหวะแบบเปิดต่อกัน (engine.skillBeat open → cutscene.runSkillFlow · เฟส ATTACKING)
//      จบคดี = ไม่มีจังหวะถัดไป → กลับตาเดินของนารุโฮโดะด้วยเวลาที่เหลือ (pausePlayingForCutscene)
//   3. รอเดี๋ยว!!! (match.holdIt): แทรกตาศัตรูเป็นตาพิเศษ (TimeStop.interrupt kind "holdIt") 15 วิ เลือก เดิน 2 / เก็บหลักฐาน / คัดค้าน
//  บทพูดทั้งหมด: server/courtLines.js
// ============================================================
Object.assign(module.exports, {
  fresh, st, isNaru, active, who, actorOf, noteAct, noteMove, lastEventOf, addEvidence, noteEvidence, liveEvidence,
  scoutSees, statementPool, contradicts, presentResult, aiTestimony,
  start, view, testimony, act, object, gallery, skip, abort, alibiTotal,
  discardEvidence, pinEvidence, canHold, holdIt, holdStart, holdClock, holdItAct, holdItAlibi, holdEnded, holdView,
});

const match = require("./match");
const { CHAR_BY_ID } = require("../characters");
const Ev = require("../characters/_court_evidence");
const Lines = require("./courtLines");

const ID = "naruhodo_ryuichi";
const RULES = {
  cred: 5, rounds: 3, statements: 3, pressPer: 1, counselObj: 1, poolMax: 9,
  wrong: 1, alibiBurn: 1, witnessBreak: 2, counselMiss: 1, maxEvidence: 5, maxAlibi: 3, sightRange: 4,
  dmg: { weapon: 3, foot: 2, receipt: 2, witness: 4 },
  heal: { receipt: 1 },
  galleryCap: 2, throwKick: 3,
  freeDmg: 5, freeStun: 2, // ไม่มีความผิด = ทนาย −5 (ผู้ใช้ 2026-11-20 · เดิม 3)
  ultCd: 5,
  sec: { testimony: 40, cross: 60, object: 3, gallery: 8 },
  aiObject: 0.45,
};
const HOLD = { range: 4, cd: 3, secs: 15, flash: 1.5, alibi: 3, move: 2 };
const TYPE_OF = { attack: "weapon", basic: "weapon", secondary: "receipt", item: "receipt", note: "receipt", ultimate: "witness", move: "foot" };
Object.assign(module.exports, { ID, RULES, HOLD });
const JUDGE = "ผู้พิพากษา";
const FINALE = { src: "/characters/naruhodo_ryuichi/court/finale.mp4", ms: 5300 }; // คลิปฉากจบ (ผู้ใช้ 2026-11-20 · 5.07 วิ เสียงในตัว) ครั้งเดียวต่อคดี
module.exports.FINALE = FINALE;

const lazy = {
  combat: () => require("./combat"),
  view: () => require("./view"),
  vis: () => require("./visibility"),
  board: () => require("./board"),
  action: () => require("./phases/action"),
  engine: () => require("./engine").engine,
  pve: () => require("./pveMode"),
  lobby: () => require("./lobby"),
};

// ---------- ตัวช่วย ----------
function fresh() {
  return { evidence: [], seq: 0, holdReady: 0, noMoveNext: false, holdSever: 0, scout: null, scoutReady: 0, ultReady: 0, objection: null };
}
function st(p) { return p.naruhodo || (p.naruhodo = fresh()); }
function isNaru(p) { return !!p && !p.summon && p.characterId === ID; }
function active() { return Object.values(match.players).some(isNaru); }
function who(p) {
  if (!p) return "";
  if (p.summon) return p.name || "";
  const ch = CHAR_BY_ID[p.characterId];
  return (ch && ch.name) || p.name || "";
}
// ระบบคู่ (เคท & เอมิลิโกะ — server/duo.js): ตัวที่สองไม่มี socket → ดูการเชื่อมต่อของเจ้าของ
const human = (p) => { const o = p && p.duoOf ? match.players[p.duoOf] : p; return !!o && !o.summon && o.connected !== false; };
const round = () => match.roundNumber || 0;
const now = () => Date.now();
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function boxDist(a, b) {
  const Board = lazy.board();
  return Board.dist(Board.boxOf(a), Board.boxOf(b));
}
// ผู้กระทำที่นับในบันทึก: ยูนิตที่ถูกเรียกที่มีเจ้าของเป็นผู้เล่น = เจ้าของ · มอน/บอส/ไม่มีเจ้าของ = ตัวมันเอง (ไม่มีข้อแก้ตัว)
//  ระบบคู่: ทั้งสองตัวนับเป็นฝ่ายเดียว = เจ้าของ (หลักฐาน/ข้อแก้ตัว/คำให้การรวมกัน · ชื่อในเหตุการณ์ยังเป็นชื่อตัวที่ลงมือ)
function actorOf(u) {
  if (!u) return null;
  if (!u.summon) return u.duoOf && match.players[u.duoOf] ? match.players[u.duoOf] : u;
  const o = match.players[u.summon.ownerId];
  if (o && !o.summon && !lazy.pve().isPveMob(u)) return o;
  return u;
}
const foeOf = (a, b) => !!a && !!b && a.id !== b.id && !lazy.combat().sameTeam(a, b);

// ---------- บันทึกเหตุการณ์ ----------
// u = ตัวที่ลงมือ (ยูนิต) · kind attack|basic|secondary|ultimate|item|move · skill = ชื่อท่า/ไอเทม · targetIds = เป้า
function noteAct(u, kind, skill, targetIds) {
  if (!u || !active() || !TYPE_OF[kind]) return null;
  const actor = actorOf(u);
  if (!actor || isNaru(actor)) return null;
  const tid = (targetIds || []).find((id) => id && id !== u.id && id !== actor.id && match.players[id]);
  const tgt = tid ? match.players[tid] : null;
  const ev = {
    id: `e${(match.courtLogSeq = (match.courtLogSeq || 0) + 1)}`, round: round(),
    actorId: actor.id, actorName: who(u.summon ? actor : u), kind, skill: String(skill || ""), targetName: tgt ? who(tgt) : null,
    type: TYPE_OF[kind], seenBy: [],
  };
  // ใครเห็น: ห่าง ≤ 4 จากตัวที่ลงมือ + มองเห็น ตอนเกิดเหตุ (ทุกผู้เล่น — ใช้ทั้งหลักฐาน/พยาน/ผู้ช่วยทนาย)
  if (u.pos) {
    for (const q of Object.values(match.players)) {
      if (q.summon || !q.alive || !q.pos || q.id === actor.id || q.id === u.id || q.duoOf === actor.id) continue;
      if (boxDist(q, u) > RULES.sightRange || lazy.vis().hiddenFrom(q, u)) continue;
      ev.seenBy.push(q.id);
    }
  }
  const log = match.courtLog || (match.courtLog = []);
  log.push(ev);
  if (log.length > 400) log.splice(0, log.length - 400);
  const narus = Object.values(match.players).filter((n) => isNaru(n) && foeOf(n, actor));
  let saw = false;
  for (const n of narus) if (ev.seenBy.includes(n.id)) { saw = true; addEvidence(n, ev); }
  // ไม่มีนารุโฮโดะฝ่ายตรงข้ามคนไหนเห็น = ข้อแก้ตัว +1 (ผู้เล่นเท่านั้น)
  if (!saw && narus.length && !actor.summon) actor.courtAlibi = Math.min(RULES.maxAlibi, (actor.courtAlibi || 0) + 1);
  return ev;
}
// เดินไกล ≥ 3 ช่องในตาเดิน (จบตา — ฮุค broadcast afterActorEnd)
function noteMove(u) {
  const a = match.action;
  if (!u || !a || match.actorId !== u.id || a.extra || !Array.isArray(a.trail)) return null;
  if (a.trail.length - 1 < 3) return null;
  return noteAct(u, "move", "เดิน", []);
}
function lastEventOf(actorId, skipKeys) {
  const log = match.courtLog || [];
  for (let i = log.length - 1; i >= 0; i--) if (log[i].actorId === actorId && !(skipKeys && skipKeys.has(log[i].id))) return log[i];
  return null;
}
function descOf(ev) {
  if (ev.kind === "move") return `รอยเท้าของ ${ev.actorName} เดินข้ามสนามตอนเทิร์น ${ev.round}`;
  if (ev.kind === "note") return `ข้อสังเกตเรื่อง ${ev.actorName} จากการสืบสวนตอนเทิร์น ${ev.round}`;
  return ev.targetName ? `${ev.actorName} ใช้ ${ev.skill} ใส่ ${ev.targetName} ตอนเทิร์น ${ev.round}` : `${ev.actorName} ใช้ ${ev.skill} ตอนเทิร์น ${ev.round}`;
}
function liveEvidence(n) { return n && n.naruhodo ? n.naruhodo.evidence.filter((e) => !e.used) : []; }
// ใส่หลักฐานลงแฟ้ม (ถือสูงสุด 5 · เต็ม = ตัดอันเก่าสุด) · มีเหตุการณ์นี้อยู่แล้ว = null
function addEvidence(n, ev) {
  if (!n || !ev) return null;
  const s = st(n);
  if (s.evidence.some((e) => e.evKey === ev.id)) return null;
  const icon = Ev.iconFor(ev.type, ev.id);
  const item = {
    id: `v${++s.seq}`, evKey: ev.id, round: ev.round, actorId: ev.actorId, actorName: ev.actorName, kind: ev.kind,
    skill: ev.skill, targetName: ev.targetName, type: ev.type, icon, name: Ev.EV_ICON_NAMES[icon] || "", desc: descOf(ev), used: false,
  };
  s.evidence = s.evidence.filter((e) => !e.used);
  // เต็มแล้ว = ตัดอันเก่าสุดที่ไม่ได้ปักหมุด 📌 (ผู้ใช้ 2026-11-20) · ปักครบทุกช่อง = ไม่รับหลักฐานใหม่
  while (s.evidence.length >= RULES.maxEvidence) {
    const i = s.evidence.findIndex((e) => !e.pinned);
    if (i < 0) return null;
    s.evidence.splice(i, 1);
  }
  s.evidence.push(item);
  return item;
}
// ปักหมุด/ถอนหมุดหลักฐาน 📌 — ชิ้นที่ปักไม่หลุดตอนแฟ้มเต็ม (ทำได้ทุกเมื่อ ยกเว้นระหว่างคดี/ตาแทรก)
function pinEvidence(id, evId) {
  const p = match.players[id];
  if (!isNaru(p) || !p.alive || !p.naruhodo || match.court || match.holdIt) return false;
  const e = st(p).evidence.find((x) => x.id === evId && !x.used);
  if (!e) return false;
  e.pinned = !e.pinned;
  lazy.view().broadcastState();
  return true;
}
// ทิ้งหลักฐานเอง (ผู้ใช้ 2026-11-20: "ต้องทิ้งได้" — แฟ้มเต็มแล้วหลักฐานดีหลุด สู้คดีไม่ได้) — ไม่เสียแต้ม/ตาเดิน · ห้ามระหว่างมีคดีหรือตาแทรก
function discardEvidence(id, evId) {
  const p = match.players[id];
  if (!isNaru(p) || !p.alive || !p.naruhodo || match.court || match.holdIt) return false;
  const s = st(p), before = s.evidence.length;
  s.evidence = s.evidence.filter((e) => e.id !== evId);
  if (s.evidence.length === before) return false;
  lazy.view().broadcastState();
  return true;
}
// หลักฐาน "ข้อสังเกต" (สืบสวน/รอเดี๋ยว!!! ไม่เจอเหตุการณ์ใหม่) — ผูกกับเป้า
function noteEvidence(n, t) {
  const actor = actorOf(t);
  const ev = { id: `n${n.id}:${(st(n).seq + 1)}:${round()}`, round: round(), actorId: actor.id, actorName: who(actor), kind: "note", skill: "ข้อสังเกต", targetName: null, type: "receipt" };
  return addEvidence(n, ev);
}
// สืบสวน: เห็นเป้าทะลุล่องหน/พุ่ม จนจบเทิร์นหน้า (visibility.hiddenFromOne)
function scoutSees(viewer, target) {
  if (!isNaru(viewer) || !target || !viewer.naruhodo) return false;
  const sc = viewer.naruhodo.scout;
  return !!sc && sc.targetId === target.id && round() <= sc.until;
}

// ---------- คำให้การ ----------
// ประโยคจากบันทึกจริงของจำเลย: lie = ปฏิเสธสิ่งที่ทำ (k = จุดที่หลักฐานจับได้) · truth = เรื่องจริง/จริงครึ่งเดียว
function statementPool(events, proven) {
  const out = [], seen = new Set();
  const add = (s) => {
    const key = `${s.kind}|${s.text}`;
    if (seen.has(key) || (proven && proven.includes(s.text))) return;
    seen.add(key);
    out.push(s);
  };
  for (const e of events) {
    const ctx = { skill: e.skill, target: e.targetName, turn: e.round };
    if (e.kind === "move") {
      add({ kind: "lie", k: { turn: e.round }, evKey: e.id, text: Lines.pick("moveLie", ctx) });
      add({ kind: "truth", evKey: e.id, text: Lines.pick("moveTruth", ctx) });
      continue;
    }
    if (e.kind === "note") continue;
    if (e.kind === "attack") add({ kind: "lie", k: { skill: e.skill }, evKey: e.id, text: Lines.pick("attackLie", ctx) });
    else if (e.kind === "ultimate") add({ kind: "lie", k: { skill: e.skill }, evKey: e.id, text: Lines.pick(Math.random() < 0.5 ? "ultLie" : "skillLie", ctx) });
    else add({ kind: "lie", k: { skill: e.skill }, evKey: e.id, text: Lines.pick("skillLie", ctx) });
    if (e.targetName) add({ kind: "lie", k: { target: e.targetName }, evKey: e.id, text: Lines.pick("targetLie", ctx) });
    add({ kind: "lie", k: { turn: e.round }, evKey: e.id, text: Lines.pick("turnLie", ctx) });
    add({ kind: "truth", evKey: e.id, text: Lines.pick(e.targetName ? "truth" : "truthSelf", ctx) });
  }
  return out;
}
function contradicts(s, ev, defendantId) {
  if (!s || s.kind !== "lie" || !ev || !s.k) return false;
  if (defendantId && ev.actorId !== defendantId) return false;
  const k = s.k;
  return (k.skill != null && ev.skill === k.skill) || (k.target != null && ev.targetName === k.target) || (k.turn != null && ev.round === k.turn);
}
function presentResult(s, ev, defendantId) {
  if (s.kind === "truth") return { kind: "irrelevant", dL: RULES.wrong };
  if (!contradicts(s, ev, defendantId)) return { kind: "wrong", dL: RULES.wrong };
  if (s.alibi && ev.type !== "witness") return { kind: "alibi", dL: RULES.alibiBurn, burn: true, breakAlibi: true };
  if (s.alibi && ev.type === "witness") return { kind: "pierce", dD: RULES.witnessBreak, breakAlibi: true, burn: true };
  return { kind: "hit", dD: RULES.dmg[ev.type] || 2, healL: RULES.heal[ev.type] || 0, burn: true, reveal: ev.type === "foot" };
}
// จำเลย AI: โกหก 2–3 + เรื่องจริงอุด · แปะข้อแก้ตัวสุ่ม
function aiTestimony(pool, alibi) {
  const n = Math.min(RULES.statements, pool.length);
  const lies = shuffle(pool.filter((s) => s.kind === "lie")), truths = shuffle(pool.filter((s) => s.kind === "truth"));
  const nl = Math.min(lies.length, Math.random() < 0.5 ? 2 : 3, n);
  let list = [...lies.slice(0, nl), ...truths.slice(0, n - nl)];
  if (list.length < n) list.push(...lies.slice(nl, nl + n - list.length));
  list = shuffle(list).map((s) => ({ key: s.key, alibi: false }));
  let a = alibi;
  for (const x of shuffle(list)) {
    const s = pool.find((q) => q.key === x.key);
    if (s && s.kind === "lie" && a > 0 && Math.random() < 0.45) { x.alibi = true; a--; }
  }
  return list;
}

// ---------- ฉาก (beat steps) ----------
// เวลาของแต่ละขั้น = client/src/court/courtSteps.js stepMs (ตัวเลขชุดเดียวกัน — server คิด sum ตรงกับที่ client เล่น)
const STEP = { pan: 420, gavelHit: 640, testifyLine: 2500, banner: { test: 1500, cross: 1900 } };
const sayMs = (text) => Math.min(5200, 1300 + Array.from(String(text || "")).length * 48);
// say: who L/D/J = ทนาย/จำเลย/ผู้พิพากษา · C = ฝ่ายค้าน · T = ผู้ช่วยทนาย/พยาน · G = ประชาชน (C/T/G ใส่ id ผู้เล่น — client ใช้ภาพหมากของคนนั้น)
const say = (who2, name, text, color, id) => ({ k: "say", who: who2, name: name || "", text, ...(color ? { color } : {}), ...(id ? { id } : {}), ms: sayMs(text) });
const sayP = (who2, p, text, color) => say(who2, who(p), text, color, p && p.id);
const P = (c, key, ctx) => Lines.pick(key, ctx, c.used);
const inner = (c, key, ctx) => say("L", c.names.L, P(c, key, ctx), "blue");
const line = (c, whoK, key, ctx, color) => say(whoK, whoK === "J" ? JUDGE : whoK === "L" ? c.names.L : whoK === "D" ? c.names.D : (ctx && ctx.C) || c.names.D, P(c, key, ctx), color);
const chance = (n) => Math.random() < n;
// ใครสักคนในกลุ่ม (ยังอยู่ · ไม่ถูกไล่) — บทแทรกของประชาชน/ผู้ช่วย/ฝ่ายค้าน
function someone(c, ids) {
  const live = ids.filter((id) => { const q = match.players[id]; return q && q.alive && !c.outIds.includes(id); });
  return live.length ? match.players[live[Math.floor(Math.random() * live.length)]] : null;
}
function coSays(c, steps, key, ctx, n) {
  const co = c.coIds.length && chance(n) ? someone(c, c.coIds) : null;
  if (co) steps.push(cam("cocounsel", co.id), sayP("T", co, P(c, key, { ...ctx, C: who(co) })));
}
function aside(c, steps, ctx, n = 0.25) { if (chance(n)) steps.push(cam("judge"), line(c, "J", "judgeAside", ctx)); }
const cam = (camK, who2) => ({ k: "cam", cam: camK, ...(who2 ? { who: who2 } : {}), ms: STEP.pan });
const gavelS = (n) => ({ k: "gavel", n, ms: n * STEP.gavelHit });
const shout = (who2, kind, name) => ({ k: "shout", who: who2, kind, ...(name ? { name } : {}), ms: 950 });
const hurtS = (side, n) => ({ k: "hurt", side, n, ms: 1100 });
const healS = (side, n) => ({ k: "heal", side, n, ms: 800 });
const evPub = (e) => ({ icon: e.icon, name: e.name, desc: e.desc });
const stepsMs = (steps) => steps.reduce((a, s) => a + (Number(s.ms) || 0), 0);

// ---------- ศาล ----------
function court() { return match.court || null; }
function ctxOf(c, extra) { return { L: c.names.L, D: c.names.D, round: c.round, ...(extra || {}) }; }
function alibiTotal(c = court()) {
  if (!c) return 0;
  const ids = [...new Set([c.sideId || c.defendantId, ...c.counselIds])];
  return ids.reduce((a, id) => a + ((match.players[id] && match.players[id].courtAlibi) || 0), 0);
}
function consumeAlibi(c, n) {
  for (const id of [...new Set([c.sideId || c.defendantId, ...c.counselIds])]) {
    const p = match.players[id];
    while (n > 0 && p && (p.courtAlibi || 0) > 0) { p.courtAlibi--; n--; }
  }
}
function lawyerOf(c) { return match.players[c.lawyerId]; }
function defendantOf(c) { return match.players[c.defendantId]; }
const unitIds = (c) => (c.defendantUnits || []).map((u) => u.id);
const defUnits = (c) => unitIds(c).map((id) => match.players[id]).filter(Boolean);
const isDefUnit = (c, id) => unitIds(c).includes(id);
const liveIds = (c, ids) => ids.filter((id) => { const p = match.players[id]; return p && p.alive && !c.outIds.includes(id); });
const humansIn = (c, ids) => liveIds(c, ids).filter((id) => human(match.players[id]));

// เริ่มคดี (ท่าไม้ตายโดน) — lawyer = นารุโฮโดะ · t = จำเลย
function start(lawyer, t) {
  if (match.court || !lawyer || !t) return false;
  const combat = lazy.combat();
  const pve = lazy.pve();
  // จำเลยระบบคู่ = ทั้งคู่ขึ้นแท่นพยานด้วยกัน (ตัวที่ถูกเลือกก่อน · ตัวที่ล้มแล้วไม่ขึ้น)
  const units = [t, ...require("./duo").unitsOf(t).filter((u) => u.id !== t.id && u.alive && !u.summon)];
  const uids = units.map((u) => u.id);
  const others = Object.values(match.players).filter((q) => !q.summon && q.alive && q.id !== lawyer.id && !uids.includes(q.id));
  const coIds = others.filter((q) => combat.sameTeam(q, lawyer)).map((q) => q.id);
  const counselIds = others.filter((q) => !coIds.includes(q.id) && combat.sameTeam(q, t)).map((q) => q.id);
  const pveMode = pve.isPveCoop() || pve.isMoon();
  const galleryIds = pveMode ? [] : others.filter((q) => !coIds.includes(q.id) && !counselIds.includes(q.id)).map((q) => q.id);
  const counsel0 = counselIds.length ? match.players[counselIds[0]] : null;
  match.court = {
    id: (match.courtSeq = (match.courtSeq || 0) + 1), phase: "opening", round: 0, rounds: RULES.rounds, deadline: null,
    lawyerId: lawyer.id, defendantId: t.id, sideId: actorOf(t).id, coIds, counselIds, galleryIds, outIds: [],
    defendantUnits: units.map((u) => ({ id: u.id, name: who(u), img: (CHAR_BY_ID[u.characterId] && CHAR_BY_ID[u.characterId].img) || u.img || null })),
    names: { L: who(lawyer), D: units.map(who).join(" & "), C: counsel0 ? who(counsel0) : "" },
    cred: { L: RULES.cred, D: RULES.cred }, list: null, cx: 0, pool: null, picks: null,
    witnessUsed: [], lent: [], pressLeft: RULES.pressPer, counselLeft: RULES.counselObj,
    beat: null, beatSeq: 0, verdict: null, music: "trial", musicAt: lazy.engine().nextTransformCounter(),
    proven: [], crossLeft: RULES.sec.cross * 1000, crossEnd: 0, pending: null, objected: false, hits: 0,
    rx: {}, tally: { L: 0, D: 0 }, throws: 0, lastThrow: null, cheers: {}, witnessSide: {}, warned: { L: 0, D: 0 }, used: [],
  };
  st(lawyer).ultReady = Number.MAX_SAFE_INTEGER; // คูลดาวน์นับหลังคดีจบ
  lazy.engine().log(`⚖️ ${lawyer.name} เริ่มการไต่สวน — จำเลย ${t.name}`);
  const c = match.court;
  const ctx = ctxOf(c);
  const steps = [gavelS(3), cam("judge"), line(c, "J", "openJudge", ctx), cam("defense"), line(c, "L", "openLawyer", ctx), inner(c, "openInner", ctx),
    cam("witness"), line(c, "D", "openDefendant", ctx)];
  if (counselIds.length) steps.push(cam("prosecution", counselIds[0]), sayP("C", counsel0, P(c, "openCounsel", { ...ctx, C: c.names.C })));
  if (coIds.length) { const co = match.players[coIds[0]]; steps.push(cam("cocounsel", co.id), sayP("T", co, P(c, "openCo", { ...ctx, C: who(co) }))); }
  if (galleryIds.length) {
    steps.push(cam("wide"), line(c, "J", "openGallery", ctx));
    const g = someone(c, galleryIds);
    if (g) steps.push(sayP("G", g, P(c, "openGalleryShout", { ...ctx, G: who(g) })));
  }
  beat(c, steps, startTestimony, "opening");
  return true;
}
// ทุกจังหวะของคดี = จังหวะแบบเปิด (ปล่อยก่อนหมดเวลาได้ — engine.releaseBeat)
function beat(c, steps, next, phase) {
  c.beat = { seq: ++c.beatSeq, steps };
  c.phase = phase || "beat";
  const ms = Math.max(300, stepsMs(steps));
  c.deadline = now() + ms;
  updateMusic(c);
  lazy.engine().skillBeat(ms / 1000, guarded(c.id, next), { open: true });
}
function wait(c, phase, secs, next) {
  c.phase = phase;
  c.beat = null;
  c.deadline = now() + Math.round(secs * 1000);
  updateMusic(c);
  lazy.engine().skillBeat(secs, guarded(c.id, next), { open: true });
}
function guarded(id, fn) {
  return () => {
    const c = court();
    if (!c || c.id !== id) return;
    if (gone(c)) { abort("gone"); return; }
    try { fn(c); } catch (err) {
      console.error("[court] ฉากศาลผิดพลาด — ปิดคดี:", err);
      abort("error");
    }
  };
}
// ทนายตาย/หลุด/หาย หรือจำเลยหายจากเกม = ยุติ ไม่มีผล
function gone(c) {
  const L = lawyerOf(c);
  return !L || !L.alive || L.connected === false || !defUnits(c).some((u) => u.alive);
}
function abort(why) {
  const c = court();
  if (!c) return;
  const L = lawyerOf(c);
  if (L && L.naruhodo) L.naruhodo.ultReady = round() + RULES.ultCd;
  match.court = null;
  lazy.engine().log(`⚖️ คดีถูกยุติ${why === "gone" ? " — คู่ความไม่อยู่" : ""}`);
}

function startTestimony(c) {
  c.round++;
  c.list = null;
  c.picks = null;
  c.cx = 0;
  c.pressLeft = RULES.pressPer;
  c.counselLeft = RULES.counselObj;
  c.crossLeft = RULES.sec.cross * 1000;
  c.rx = {}; c.tally = { L: 0, D: 0 }; c.throws = 0; c.lastThrow = null;
  const events = (match.courtLog || []).filter((e) => e.actorId === c.sideId);
  const all = statementPool(events, c.proven);
  const lies = shuffle(all.filter((s) => s.kind === "lie")).slice(0, 6);
  const truths = shuffle(all.filter((s) => s.kind === "truth")).slice(0, RULES.poolMax - lies.length);
  let pool = shuffle([...lies, ...truths]).slice(0, RULES.poolMax);
  const gen = shuffle(Lines.STATEMENTS.generic);
  while (pool.length < RULES.statements && gen.length) pool.push({ kind: "truth", text: gen.shift() });
  pool = pool.map((s, i) => ({ ...s, key: `r${c.round}s${i}` }));
  c.pool = pool;
  if (humansIn(c, [...unitIds(c), ...c.counselIds]).length) wait(c, "testimony", RULES.sec.testimony, finishTestimony);
  else finishTestimony(c);
}
// จำเลย/ฝ่ายค้านส่งคำให้การ (socket courtTestimony)
function testimony(id, picks) {
  const c = court();
  if (!c || c.phase !== "testimony" || c.picks) return false;
  if (!isDefUnit(c, id) && !c.counselIds.includes(id)) return false;
  if (!Array.isArray(picks)) return false;
  const n = Math.min(RULES.statements, c.pool.length);
  if (picks.length !== n) return false;
  const keys = new Set();
  let pins = 0;
  for (const x of picks) {
    const s = x && c.pool.find((q) => q.key === x.key);
    if (!s || keys.has(s.key)) return false;
    keys.add(s.key);
    if (x.alibi === true) { if (s.kind !== "lie") return false; pins++; }
  }
  if (pins > alibiTotal(c)) return false;
  c.picks = picks.map((x) => ({ key: x.key, alibi: x.alibi === true }));
  lazy.engine().releaseBeat();
  return true;
}
function finishTestimony(c) {
  const picks = c.picks || aiTestimony(c.pool, alibiTotal(c));
  c.list = picks.map((x) => {
    const s = c.pool.find((q) => q.key === x.key);
    return { key: s.key, text: s.text, kind: s.kind, k: s.k || null, evKey: s.evKey || null, alibi: !!x.alibi, done: false, pressed: false, presentTried: false, alibiShown: false };
  });
  c.pool = null;
  const ctx = ctxOf(c);
  // 1) ผู้พิพากษาสั่งให้การ (ฉาก) → 2) testify: client เล่นคำให้การเอง (แบนเนอร์ 1.5 วิ + 2.5 วิ/ประโยค — beat = null)
  //  → 3) แบนเนอร์ซักค้าน + ความคิดในใจ → ซักค้าน
  const intro = [cam("judge"), line(c, "J", "testJudge", ctx), cam("witness"), line(c, "D", c.round > 1 ? "testDefendantLate" : "testDefendant", ctx)];
  beat(c, intro, (cc) => {
    wait(cc, "testify", (STEP.banner.test + STEP.testifyLine * cc.list.length) / 1000, (c3) => {
      const outro = [cam("defense"), inner(c3, "testInner", ctx), { k: "banner", kind: "cross", ms: STEP.banner.cross }, cam("defense"), inner(c3, "crossInner", ctx)];
      beat(c3, outro, enterCross);
    });
  });
}
function enterCross(c) {
  if (verdictDue(c)) { toVerdict(c); return; }
  if (c.list.every((s) => s.done)) { endRound(c); return; }
  c.pending = null;
  const left = Math.max(5000, c.crossLeft);
  c.crossEnd = now() + left;
  wait(c, "cross", left / 1000, crossNext);
}
// ทนาย/ผู้ช่วยกด (socket courtAct)
function act(id, { type, idx, evId, evKey } = {}) {
  const c = court();
  if (!c || c.phase !== "cross" || c.pending) return false;
  const lawSide = id === c.lawyerId || c.coIds.includes(id);
  if (!lawSide) return false;
  const i = Number(idx);
  const s = Number.isInteger(i) ? c.list[i] : null;
  if (type === "view") {
    if (!s) return false;
    c.cx = i;
    lazy.view().broadcastState();
    return true;
  }
  if (type === "press") {
    if (!s || s.done || s.pressed || c.pressLeft <= 0) return false;
    c.pending = { type, idx: i, by: id };
  } else if (type === "present") {
    if (!s || s.done || s.presentTried) return false;
    const ev = liveEvidence(lawyerOf(c)).find((e) => e.id === evId);
    if (!ev) return false;
    c.pending = { type, idx: i, evId: ev.id, by: id };
  } else if (type === "end") {
    c.pending = { type, by: id };
  } else if (type === "lend") {
    if (!c.coIds.includes(id) || c.lent.includes(id)) return false;
    const e = sightingEvent(c, id, evKey);
    if (!e || st(lawyerOf(c)).evidence.some((v) => v.evKey === e.id)) return false;
    c.pending = { type, evKey: e.id, by: id };
  } else return false;
  c.crossLeft = Math.max(0, c.crossEnd - now());
  lazy.engine().releaseBeat();
  return true;
}
function crossNext(c) {
  const p = c.pending;
  c.pending = null;
  if (!p) { c.crossLeft = 0; endRound(c); return; } // หมดเวลาซักค้าน = จบยก
  c.cx = Number.isInteger(p.idx) ? p.idx : c.cx;
  if (p.type === "end") { endRound(c); return; }
  if (p.type === "press") { doPress(c, p); return; }
  if (p.type === "lend") { doLend(c, p); return; }
  if (p.type === "present") { doPresent(c, p); return; }
  enterCross(c);
}
function doPress(c, p) {
  const s = c.list[p.idx];
  s.pressed = true;
  c.pressLeft--;
  const ctx = ctxOf(c);
  const steps = [cam("defense"), shout("L", "holdit"), line(c, "L", "pressLawyer", ctx), cam("witness")];
  if (s.alibi) {
    s.alibi = false;
    s.alibiShown = true;
    consumeAlibi(c, 1);
    steps.push(line(c, "D", "pressAlibiDef", ctx), cam("judge"), line(c, "J", "pressAlibiJudge", ctx));
    const e = s.evKey && (match.courtLog || []).find((x) => x.id === s.evKey);
    const got = e ? addEvidence(lawyerOf(c), e) : null;
    if (got) steps.push({ k: "present", ev: evPub(got), ms: 1500 });
    steps.push(cam("defense"), inner(c, "pressAlibiInner", ctx));
  } else if (s.kind === "lie") {
    steps.push(line(c, "D", "pressLieDef", { ...ctx, skill: s.k && s.k.skill }), cam("defense"), inner(c, "pressNothingInner", ctx));
    aside(c, steps, ctx);
  } else {
    steps.push(line(c, "D", "pressTruthDef", ctx), cam("defense"), inner(c, "pressNothingInner", ctx));
  }
  beat(c, steps, afterAction);
}
function doLend(c, p) {
  const e = (match.courtLog || []).find((x) => x.id === p.evKey);
  c.lent.push(p.by);
  const got = e ? addEvidence(lawyerOf(c), e) : null;
  const co = who(match.players[p.by]);
  const ctx = ctxOf(c, { C: co, skill: e && e.skill, target: e && e.targetName, turn: e && e.round });
  const steps = [cam("cocounsel", p.by), say("T", co, P(c, "coLend", ctx), null, p.by)];
  if (got) steps.push({ k: "present", ev: evPub(got), ms: 1500 });
  beat(c, steps, afterAction);
}
function doPresent(c, p) {
  const ev = liveEvidence(lawyerOf(c)).find((e) => e.id === p.evId);
  if (!ev) { enterCross(c); return; }
  const ctx = ctxOf(c, { ev: ev.name });
  // หลักฐานชี้ขาด (จำเลยหมดความน่าเชื่อถือ) = คลิปฉากจบเล่นแทนทั้งก้อน — ห้ามเสียงตะโกน/เสียงยื่นหลักฐานก่อนคลิป (กฎผู้ใช้ 2026-11-03)
  const fin = isFinale(c, c.list[p.idx], ev);
  const steps = fin ? [cam("defense")] : [cam("defense"), shout("L", "takethat"), line(c, "L", "presentLawyer", ctx), { k: "present", ev: evPub(ev), ms: 1500 }];
  c.held = { idx: p.idx, evId: ev.id, objected: false };
  const counsel = liveIds(c, c.counselIds);
  if (c.counselLeft > 0 && counsel.length) {
    const humans = humansIn(c, c.counselIds);
    beat(c, steps, (cc) => {
      if (humans.length) wait(cc, "objectWindow", RULES.sec.object, resolvePresent);
      else { if (Math.random() < RULES.aiObject) cc.held.objected = counsel[0]; resolvePresent(cc); }
    });
    return;
  }
  beat(c, steps, resolvePresent);
}
// ฝ่ายค้านกด คัดค้าน! (socket courtObject)
function object(id) {
  const c = court();
  if (!c || c.phase !== "objectWindow" || !c.held || c.held.objected || c.counselLeft <= 0) return false;
  if (!c.counselIds.includes(id) || c.outIds.includes(id)) return false;
  c.held.objected = id;
  lazy.engine().releaseBeat();
  return true;
}
function resolvePresent(c) {
  const h = c.held;
  c.held = null;
  const L = lawyerOf(c);
  const s = c.list[h.idx];
  const ev = liveEvidence(L).find((e) => e.id === h.evId);
  if (!s || !ev) { afterAction(c); return; }
  const r = presentResult(s, ev, c.sideId);
  const steps = [];
  const ctx = ctxOf(c, { ev: ev.name, skill: ev.skill, target: ev.targetName, turn: ev.round });
  if (h.objected) {
    c.counselLeft--;
    s.presentTried = true;
    const cn = who(match.players[h.objected]) || c.names.C;
    steps.push(cam("prosecution", h.objected), shout("C", "objection", cn), say("C", cn, P(c, "counselObject", ctx), null, h.objected), cam("judge"));
    // ทายใจ: หลักฐานจะจับได้จริง = ปัดตก (หลักฐานไม่เสีย) · หลักฐานผิดอยู่แล้ว = ฝ่ายจำเลย −1 (คัดค้านมั่ว)
    if (r.kind === "hit" || r.kind === "pierce" || r.kind === "alibi") {
      steps.push(line(c, "J", "counselJudgeOk", ctx), cam("defense"), inner(c, "counselInnerOk", ctx));
      if (chance(0.5)) steps.push(cam("prosecution", h.objected), say("C", cn, P(c, "counselCheer", { ...ctx, C: cn }), null, h.objected));
    } else {
      steps.push(line(c, "J", "counselJudgeBad", ctx), hurtS("D", RULES.counselMiss), inner(c, "counselInnerBad", ctx));
      credHit(c, "D", RULES.counselMiss, steps);
    }
    beat(c, steps, afterAction);
    return;
  }
  if (r.kind === "irrelevant" || r.kind === "wrong") {
    s.presentTried = true;
    steps.push(cam("judge"), line(c, "J", r.kind === "wrong" ? "wrongJudge" : "irrelevantJudge", ctx), hurtS("L", r.dL), cam("witness"), line(c, "D", "wrongDefendant", ctx), cam("defense"), inner(c, "wrongInner", ctx));
    credHit(c, "L", r.dL, steps);
    coSays(c, steps, "coCheer", ctx, 0.6);
    aside(c, steps, ctx, 0.2);
  } else if (r.kind === "alibi") {
    ev.used = true;
    s.alibi = false;
    s.alibiShown = true;
    consumeAlibi(c, 1);
    steps.push(cam("witness"), line(c, "D", "alibiDefendant", ctx), cam("judge"), line(c, "J", "alibiJudge", ctx), hurtS("L", r.dL), cam("defense"), inner(c, "alibiInner", ctx));
    credHit(c, "L", r.dL, steps);
    coSays(c, steps, "coCheer", ctx, 0.5);
  } else {
    ev.used = true;
    s.done = true;
    if (s.alibi) { s.alibi = false; s.alibiShown = true; consumeAlibi(c, 1); }
    c.proven.push(s.text);
    c.hits++;
    const key = r.kind === "pierce" ? null : { weapon: "hitWeapon", foot: "hitFoot", receipt: "hitReceipt", witness: "hitWitness" }[ev.type];
    if (!c.finaleUsed && c.cred.D - r.dD <= 0) {
      // ฉากจบ: คลิป "ผมขอคัดค้าน" (มีเสียงในตัว) เงียบเพลงศาลระหว่างคลิป → หลักฐาน/ดาเมจหลังคลิป → คำตัดสิน
      c.finaleUsed = true;
      c.silent = true;
      steps.push(cam("defense"), { k: "clip", src: FINALE.src, ms: FINALE.ms }, { k: "present", ev: evPub(ev), ms: 1500 }, cam("witness"), hurtS("D", r.dD), line(c, "D", "defOne", ctx));
      c.cred.D = 0;
    } else {
      steps.push(shout("L", "objection"), cam("defense"), r.kind === "pierce" ? line(c, "L", "pierceLawyer", ctx, "red") : line(c, "L", key || "hitWeapon", ctx, "red"),
        { k: "clash", ms: 1500 }, cam("witness"), hurtS("D", r.dD), line(c, "D", "hitDefendant", ctx), cam("judge"), line(c, "J", r.kind === "pierce" ? "pierceJudge" : "hitJudge", ctx));
      credHit(c, "D", r.dD, steps);
      if (c.cred.D > 0) {
        if (chance(0.5)) steps.push(cam("defense"), inner(c, "hitInner", ctx));
        coSays(c, steps, "coHit", ctx, 0.5);
        const g = chance(0.35) ? someone(c, c.galleryIds) : null;
        if (g) steps.push(cam("wide"), sayP("G", g, P(c, "galleryCheer", { ...ctx, G: who(g) })));
        const cs = c.counselIds.length && chance(0.4) ? someone(c, c.counselIds) : null;
        if (cs) steps.push(cam("prosecution", cs.id), sayP("C", cs, P(c, "counselCheer", { ...ctx, C: who(cs) })));
      }
    }
    if (r.healL > 0 && c.cred.L < RULES.cred) {
      c.cred.L = Math.min(RULES.cred, c.cred.L + r.healL);
      steps.push(healS("L", r.healL), inner(c, "healInner", ctx));
    }
    if (r.reveal) {
      let any = false;
      for (const q of c.list) if (!q.done && q.alibi) { q.alibiShown = true; any = true; }
      if (any) steps.push(inner(c, "revealInner", ctx));
    }
  }
  beat(c, steps, afterAction);
}
// ความน่าเชื่อถือลด + บทตามเกณฑ์ (≤2 / 1)
function credHit(c, side, n, steps) {
  c.cred[side] = Math.max(0, c.cred[side] - n);
  const v = c.cred[side];
  const ctx = ctxOf(c);
  if (v > 0 && v <= 2 && c.warned[side] !== (v === 1 ? 1 : 2)) {
    c.warned[side] = v === 1 ? 1 : 2;
    if (side === "D") {
      steps.push(cam("witness"), line(c, "D", v === 1 ? (chance(0.5) ? "defOne" : "crossFinalDef") : "defLow", ctx));
      if (v === 2) steps.push(cam("judge"), line(c, "J", "judgeWarnD", ctx));
      if (v === 1) steps.push(cam("defense"), inner(c, "crossFinal", ctx));
    } else {
      steps.push(cam("defense"), inner(c, v === 1 ? "lawOne" : "lawLow", ctx));
      if (v === 2) steps.push(cam("judge"), line(c, "J", "judgeWarnL", ctx));
    }
  }
}
function afterAction(c) {
  if (verdictDue(c)) { toVerdict(c); return; }
  if (c.list && c.list.every((s) => s.done)) { endRound(c); return; }
  enterCross(c);
}
function isFinale(c, s, ev) {
  if (!s || !ev || c.finaleUsed) return false;
  const r = presentResult(s, ev, c.sideId);
  return (r.kind === "hit" || r.kind === "pierce") && c.cred.D - r.dD <= 0;
}
function verdictDue(c) { return c.cred.L <= 0 || c.cred.D <= 0; }

// ---------- ประชาชน ----------
function endRound(c) {
  const g = humansIn(c, c.galleryIds);
  if (g.length && !verdictDue(c)) { c.rx = {}; wait(c, "gallery", RULES.sec.gallery, resolveGallery); return; }
  nextRound(c);
}
function nextRound(c) {
  if (verdictDue(c) || c.round >= c.rounds) { toVerdict(c); return; }
  startTestimony(c);
}
// เหตุการณ์ของจำเลยที่ viewer เห็นเอง (พยาน/ผู้ช่วยทนาย)
function sightingsOf(c, viewerId) {
  return (match.courtLog || []).filter((e) => e.actorId === c.sideId && (e.seenBy || []).includes(viewerId));
}
function sightingEvent(c, viewerId, key) {
  return sightingsOf(c, viewerId).find((e) => e.id === key) || null;
}
// socket courtGallery { e: cheer|boo|throw|witnessL|witnessD, side, evKey }
function gallery(id, { e, side, evKey } = {}) {
  const c = court();
  if (!c || c.phase !== "gallery" || !c.galleryIds.includes(id) || c.outIds.includes(id) || c.rx[id]) return false;
  const p = match.players[id];
  if (!p || !p.alive) return false;
  if (e === "cheer" || e === "boo" || e === "throw") {
    if (side !== "L" && side !== "D") return false;
    c.rx[id] = { e, side };
  } else if (e === "witnessL") {
    if (c.witnessUsed.includes(id)) return false;
    const ev = sightingEvent(c, id, evKey);
    if (!ev || st(lawyerOf(c)).evidence.some((v) => v.evKey === ev.id)) return false;
    c.rx[id] = { e, side: "L", evKey: ev.id };
  } else if (e === "witnessD") {
    if (c.witnessUsed.includes(id)) return false;
    c.rx[id] = { e, side: "D" };
  } else return false;
  if (humansIn(c, c.galleryIds).every((g) => c.rx[g])) lazy.engine().releaseBeat();
  else lazy.view().broadcastState();
  return true;
}
const EMO = { cheer: "👏", boo: "👎", throw: "🍅" };
function resolveGallery(c) {
  const steps = [];
  const ctx = ctxOf(c);
  const rxList = [];
  const delta = { L: 0, D: 0 };
  let throws = 0, lastThrow = null;
  for (const [id, r] of Object.entries(c.rx)) {
    if (r.e === "cheer" || r.e === "boo" || r.e === "throw") {
      rxList.push({ id, e: EMO[r.e], side: r.side });
      delta[r.side] += r.e === "cheer" ? 1 : -1;
      if (r.e === "cheer") { const t = c.cheers[id] || (c.cheers[id] = { L: 0, D: 0 }); t[r.side]++; }
      if (r.e === "throw") { throws++; lastThrow = id; }
    }
  }
  if (rxList.length) {
    steps.push(cam("wide"), { k: "gallery", rx: rxList, ms: 2800 });
    for (const r of rxList.slice(0, 3)) {
      const g = who(match.players[r.id]);
      const key = r.e === "👏" ? "galleryCheer" : r.e === "👎" ? "galleryBoo" : "galleryThrow";
      steps.push(say("G", g, P(c, key, { ...ctx, G: g }), null, r.id));
    }
  }
  for (const side of ["L", "D"]) {
    const d = Math.max(-RULES.galleryCap, Math.min(RULES.galleryCap, delta[side]));
    if (d > 0) {
      const was = c.cred[side];
      c.cred[side] = Math.min(RULES.cred, c.cred[side] + d);
      steps.push(healS(side, d));
      if (was <= 2) steps.push(side === "L" ? inner(c, "lawComeback", ctx) : line(c, "D", "defComeback", ctx));
    }
    if (d < 0) { steps.push(hurtS(side, -d)); credHit(c, side, -d, steps); }
  }
  if (rxList.length) steps.push(gavelS(1), cam("judge"), line(c, "J", "galleryJudge", ctx));
  if (throws > 0 && chance(0.6)) steps.push(cam("defense"), inner(c, "galleryTomatoGag", ctx));
  if (throws > RULES.throwKick && lastThrow) {
    c.outIds.push(lastThrow);
    const g = who(match.players[lastThrow]);
    steps.push({ k: "kick", id: lastThrow, ms: 700 }, say("J", JUDGE, P(c, "galleryKick", { ...ctx, G: g }), "red"), say("G", g, P(c, "galleryKickLine", { ...ctx, G: g }), null, lastThrow));
  }
  // พยาน
  for (const [id, r] of Object.entries(c.rx)) {
    if (r.e !== "witnessL" && r.e !== "witnessD") continue;
    c.witnessUsed.push(id);
    c.witnessSide[id] = r.side;
    const g = who(match.players[id]);
    if (r.e === "witnessL") {
      const ev = (match.courtLog || []).find((x) => x.id === r.evKey);
      const got = ev ? addEvidence(lawyerOf(c), ev) : null;
      steps.push(cam("cocounsel", id), say("T", g, P(c, "witnessL", { ...ctx, skill: ev && ev.skill, target: ev && ev.targetName, turn: ev && ev.round }), null, id));
      if (got) steps.push({ k: "present", ev: evPub(got), ms: 1500 });
    } else {
      const D = match.players[c.sideId];
      if (D && !D.summon) D.courtAlibi = Math.min(RULES.maxAlibi, (D.courtAlibi || 0) + 1);
      steps.push(cam("cocounsel", id), say("T", g, P(c, "witnessD", ctx), null, id));
    }
    steps.push(cam("judge"), line(c, "J", "witnessJudge", ctx));
  }
  c.rx = {};
  if (!steps.length) { nextRound(c); return; }
  beat(c, steps, nextRound);
}

// ---------- คำตัดสิน ----------
function toVerdict(c) {
  let w = "tie";
  if (c.cred.D <= 0) w = "guilty";
  else if (c.cred.L <= 0) w = "free";
  else if (c.cred.D < c.cred.L) w = "guilty";
  else if (c.cred.L < c.cred.D) w = "free";
  const winSide = w === "guilty" ? "L" : w === "free" ? "D" : null;
  const rewards = [];
  if (winSide) {
    let best = 0;
    for (const t of Object.values(c.cheers)) best = Math.max(best, t[winSide] || 0);
    const ids = new Set();
    if (best >= 1) for (const [id, t] of Object.entries(c.cheers)) if ((t[winSide] || 0) === best) ids.add(id);
    for (const [id, side] of Object.entries(c.witnessSide)) if (side === winSide) ids.add(id);
    for (const id of ids) {
      const p = match.players[id];
      if (!p || !p.alive || c.outIds.includes(id)) continue;
      rewards.push({ id, name: who(p), hp: 1, ...(c.witnessSide[id] === winSide ? { gold: 2 } : {}) });
    }
  }
  c.verdict = { w, rewards, ...(w === "free" ? { lawyerDmg: RULES.freeDmg, lawyerStun: RULES.freeStun } : {}) };
  const ctx = ctxOf(c);
  const steps = [cam("judge"), gavelS(3), line(c, "J", w === "guilty" ? "verdictGuilty" : w === "free" ? "verdictFree" : "verdictTie", ctx), { k: "verdict", w, ms: 3800 }];
  if (w === "guilty") steps.push(cam("defense"), inner(c, "afterGuiltyLawyer", ctx), cam("witness"), line(c, "D", "afterGuiltyDef", ctx), cam("judge"), line(c, "J", "afterGuiltyJudge", ctx));
  else if (w === "free") steps.push(cam("witness"), line(c, "D", "afterFreeDef", ctx), cam("defense"), inner(c, "afterFreeLawyer", ctx));
  else steps.push(line(c, "J", "afterTieJudge", ctx), cam("defense"), inner(c, "afterTieInner", ctx));
  beat(c, steps, applyVerdict, "verdict");
}
function applyVerdict(c) {
  const combat = lazy.combat(), engine = lazy.engine();
  const L = lawyerOf(c), D = defendantOf(c);
  const v = c.verdict;
  const units = defUnits(c);
  match.court = null;
  if (L && L.naruhodo) L.naruhodo.ultReady = round() + RULES.ultCd;
  if (v.w === "guilty" && units.some((u) => u.alive)) {
    // ตายแน่นอน — ข้ามจุติ/อมตะ/ฟื้นทุกแบบ (ผู้ใช้ 2026-11-20) · ผู้สังหาร = ทนาย · ระบบคู่ = ทั้งคู่
    for (const u of units) {
      if (!u.alive) continue;
      combat.withEffectSource(L, () => combat.instantDeath(u, "final"));
      if (!u.alive) { u.pos = null; engine.log(`⚖️ ${u.name} มีความผิด — ตกรอบ!`); }
    }
  } else if (v.w === "free" && L && L.alive) {
    combat.withEffectSource(null, () => combat.dealMixed(L, RULES.freeDmg, false));
    if (L.alive && L.hp <= 0) combat.instantDeath(L);
    if (!L.alive) L.pos = null;
    else {
      L.statuses.stun = Math.max(L.statuses.stun || 0, RULES.freeStun);
      const a = match.action;
      if (a && match.actorId === L.id) { a.locked = true; a.noStrike = true; a.noSkill = true; } // แพ้คดี = ตานี้ทำอะไรต่อไม่ได้
    }
    engine.log(`⚖️ ${D ? D.name : "จำเลย"} ไม่มีความผิด — ${L.name} −${RULES.freeDmg} + สตั้น ${RULES.freeStun} เทิร์น`);
  } else engine.log("⚖️ คดีไม่มีข้อสรุป");
  for (const r of v.rewards) {
    const p = match.players[r.id];
    if (!p || !p.alive) continue;
    combat.healHp(p, r.hp);
    if (r.gold) engine.addGold(p, r.gold);
  }
}

// ---------- เพลง ----------
function updateMusic(c) {
  if (c.silent && c.phase === "beat") { if (c.music !== null) { c.music = null; c.musicAt = lazy.engine().nextTransformCounter(); } return; }
  c.silent = false;
  let m = "think";
  if (c.phase === "opening" || c.phase === "testimony" || c.phase === "testify") m = c.hits > 0 ? "objection" : "trial";
  else if (c.hits > 0) m = "objection";
  if (c.cred.L <= 2) m = "trouble";
  if (c.cred.D <= 2) m = "cornered";
  if (c.cred.D === 1) m = "pursuit";
  if (c.verdict && c.verdict.w === "guilty") m = "victory";
  if (m !== c.music) { c.music = m; c.musicAt = lazy.engine().nextTransformCounter(); }
}

// ---------- state ต่อผู้ชม ----------
function view(viewerId, controlId) {
  const c = court();
  if (!c) return null;
  const ids = [viewerId, controlId].filter(Boolean);
  const isDef = ids.some((id) => isDefUnit(c, id)) || c.counselIds.some((id) => ids.includes(id));
  const isLaw = ids.includes(c.lawyerId) || c.coIds.some((id) => ids.includes(id));
  const me = controlId || viewerId;
  return {
    id: c.id, phase: c.phase, round: c.round, rounds: c.rounds, deadline: c.deadline,
    lawyerId: c.lawyerId, defendantId: c.defendantId, defendantUnits: (c.defendantUnits || []).map((u) => ({ ...u })), coIds: [...c.coIds], counselIds: [...c.counselIds], galleryIds: [...c.galleryIds], outIds: [...c.outIds],
    cred: { ...c.cred },
    list: c.list ? c.list.map((s) => ({ text: s.text, done: s.done, pressed: s.pressed, presentTried: s.presentTried, alibiShown: s.alibiShown, ...(isDef ? { alibi: s.alibi, kind: s.kind } : {}) })) : null,
    cx: c.cx,
    pool: isDef && c.phase === "testimony" && c.pool ? c.pool.map((s) => ({ key: s.key, text: s.text, kind: s.kind })) : null,
    alibiLeft: isDef ? alibiTotal(c) : undefined,
    evidence: isLaw ? liveEvidence(lawyerOf(c)) : undefined,
    sightings: me && !isDefUnit(c, me) ? sightingsOf(c, me).map((e) => { const icon = Ev.iconFor(e.type, e.id); return { key: e.id, desc: descOf(e), icon, name: Ev.EV_ICON_NAMES[icon] || "", type: e.type }; }) : [],
    witnessUsed: [...c.witnessUsed], lent: [...c.lent],
    rx: c.phase === "gallery" ? Object.keys(c.rx) : [],
    pressLeft: c.pressLeft, counselLeft: c.counselLeft,
    beat: c.beat, verdict: c.verdict, music: c.music,
  };
}
function skip() { return false; } // กดข้ามข้อความ (client) — ไม่มีผลฝั่ง server

// ============================================================
//  รอเดี๋ยว!!! (ปุ่มติดตัว · แทรกตาศัตรู)
// ============================================================
function canHold(p) {
  if (!isNaru(p) || !p.alive || !p.pos) return false;
  if (!require("./passiveSeal").on(p)) return false; // ลบสกิลติดตัว = กดไม่ได้
  const s = st(p);
  if (round() < s.holdReady || (p.statuses.stun || 0) > 0 || ((p.statuses.sleep || 0) > 0 && !p.sleepFresh)) return false;
  if (match.gameState !== "ACTION" || !match.action || match.action.extra || match.court || match.holdIt || match.timeFreeze) return false;
  if (require("./clockUp").active()) return false;
  if (require("./roadtrip").blocksCombatCmd()) return false;
  const actor = match.players[match.actorId];
  if (!actor || actor.id === p.id || !actor.alive || !actor.pos || actor.summon) return false;
  if (lazy.combat().sameTeam(p, actor) || (require("./duo").sideKey(actor) || actor.id) === (require("./duo").sideKey(p) || p.id)) return false;
  if (boxDist(p, actor) > HOLD.range || lazy.vis().hiddenFrom(p, actor)) return false;
  return true;
}
function holdIt(id) {
  const p = match.players[id];
  if (!canHold(p)) return false;
  const s = st(p), engine = lazy.engine();
  const actor = match.players[match.actorId];
  s.holdReady = round() + HOLD.cd;
  s.noMoveNext = true;
  s.holdSever = engine.severStamp();
  match.holdIt = { seq: (match.holdItSeq = (match.holdItSeq || 0) + 1), lawyerId: p.id, actorId: actor.id, phase: "flash", deadline: now() + HOLD.flash * 1000, result: null };
  engine.boardFx("naruhodoHoldIt", { kind: "shout", id: p.id, by: p.id, targetId: actor.id, from: { ...p.pos }, to: { ...actor.pos } });
  engine.log(`✋ ${p.name} รอเดี๋ยว!!! — แทรกตาของ ${actor.name}`);
  engine.timeStop.interrupt(p.id, "holdIt", match.timeLeft);
  return true;
}
// ฮุค onExtraTurn kind "holdIt": ตาแทรกห้ามทุกอย่างนอกจาก holdItAct (action.holdIt — action.canAct) · ฉาก 待った! ก่อน
function holdStart(p) {
  const a = match.action, h = match.holdIt;
  if (!a || !h || h.lawyerId !== p.id) return;
  a.holdIt = true; a.locked = true; a.noStrike = true; a.noSkill = true; a.movLeft = HOLD.move;
  const engine = lazy.engine();
  engine.skillBeat(HOLD.flash, () => {
    const hh = match.holdIt;
    if (!hh || hh.lawyerId !== p.id) return;
    hh.phase = "choose";
    hh.deadline = now() + HOLD.secs * 1000;
    hh.clocked = false;
  }, { open: true });
  engine.pausePlayingForCutscene();
}
// ฮุค clockSeconds: กลับจากฉาก 待った! = 15 วิ
function holdClock(p) {
  const h = match.holdIt, a = match.action;
  if (!h || !a || a.extra !== "holdIt" || h.lawyerId !== p.id || h.phase !== "choose" || h.clocked) return 0;
  h.clocked = true;
  return HOLD.secs;
}
function endHold(secs) {
  const engine = lazy.engine();
  engine.skillBeat(secs, () => {}, { open: true });
  engine.pausePlayingForCutscene(null, { endTurn: true });
}
// socket holdItAct { kind: move|gather|object, tile, evId }
function holdItAct(id, { kind, tile, evId } = {}) {
  const p = match.players[id], h = match.holdIt, a = match.action;
  if (!p || !h || h.lawyerId !== id || h.phase !== "choose" || h.result || match.gameState !== "ACTION" || match.actorId !== id || !a || a.extra !== "holdIt") return false;
  const engine = lazy.engine();
  const actor = match.players[h.actorId];
  if (kind === "move") {
    if (!tile || !Number.isInteger(tile.x) || !Number.isInteger(tile.y)) return false;
    a.holdIt = false; a.locked = false;
    let ok = false;
    try { ok = lazy.action().moveTo(id, tile.x, tile.y); } finally { if (match.action === a) { a.holdIt = true; a.locked = true; } }
    if (!ok || !a.moved) return false;
    h.result = { kind: "move" };
    if (match.gameState === "ACTION" && match.actorId === id) endHold(1);
    return true;
  }
  if (!actor || !actor.alive) return false;
  if (kind === "gather") {
    const s = st(p);
    const held = new Set(s.evidence.map((e) => e.evKey));
    const ev = lastEventOf(actorOf(actor).id, held);
    const got = ev ? addEvidence(p, ev) : noteEvidence(p, actor);
    h.result = { kind: "gather", ev: got ? evPub(got) : null };
    engine.boardFx("naruhodoScout", { kind: "gather", id: p.id, by: p.id, targetId: actor.id, from: { ...p.pos }, to: actor.pos ? { ...actor.pos } : null, icon: got ? got.icon : null });
    endHold(1.2);
    return true;
  }
  if (kind === "object") {
    const ev = liveEvidence(p).find((e) => e.id === evId && e.actorId === actorOf(actor).id);
    if (!ev) return false;
    h.evId = ev.id;
    h.result = null;
    if ((actorOf(actor).courtAlibi || 0) > 0 && human(actor)) {
      h.phase = "alibi";
      h.deadline = now() + HOLD.alibi * 1000;
      engine.skillBeat(HOLD.alibi, () => resolveObject(p), { open: true });
      engine.skillBeat(1.2, () => {}, { open: true });
      engine.pausePlayingForCutscene(null, { endTurn: true });
      return true;
    }
    resolveObject(p);
    endHold(1.2);
    return true;
  }
  return false;
}
// ผู้ถูกแทรกสวนด้วยข้อแก้ตัว (socket holdItAlibi)
function holdItAlibi(id) {
  const h = match.holdIt;
  if (!h || h.phase !== "alibi" || h.alibiUsed) return false;
  const actor = match.players[h.actorId];
  const side = actor && actorOf(actor);
  const ok = actor && (actor.id === id || require("./duo").controlledId(id) === actor.id || side.id === id);
  if (!ok || (side.courtAlibi || 0) <= 0) return false;
  h.alibiUsed = true;
  lazy.engine().releaseBeat();
  return true;
}
function resolveObject(p) {
  const h = match.holdIt;
  if (!h || !p) return;
  const engine = lazy.engine(), combat = lazy.combat();
  const actor = match.players[h.actorId];
  const ev = liveEvidence(p).find((e) => e.id === h.evId);
  if (ev) ev.used = true;
  h.phase = "choose";
  const side = actor && actorOf(actor);
  if (h.alibiUsed && side && (side.courtAlibi || 0) > 0) {
    side.courtAlibi--;
    combat.withEffectSource(null, () => combat.dealArmorOnly(p, 2, false));
    h.result = { kind: "object", ok: false, ev: ev ? evPub(ev) : null };
    engine.boardFx("naruhodoHoldIt", { kind: "alibi", id: p.id, by: p.id, targetId: h.actorId, icon: ev ? ev.icon : null });
    engine.log(`📍 ${actor.name} ข้อแก้ตัว! คำคัดค้านของ ${p.name} ล้ม — เกราะ −2`);
    return;
  }
  h.result = { kind: "object", ok: true, ev: ev ? evPub(ev) : null };
  const a = match.action;
  const r = a && a.resume;
  if (r && r.action) { r.action.noSkill = true; r.action.noStrike = true; }
  if (actor) {
    actor.statuses.naruhodoObjected = 1;
    st(p).objection = { targetId: actor.id, round: round(), at: engine.severStamp() };
  }
  engine.boardFx("naruhodoHoldIt", { kind: "object", id: p.id, by: p.id, targetId: h.actorId, icon: ev ? ev.icon : null, from: p.pos ? { ...p.pos } : null, to: actor && actor.pos ? { ...actor.pos } : null });
  engine.log(`☝️ ${p.name} คัดค้าน! — ${actor ? actor.name : ""} ใช้สกิล/ตีไม่ได้จนจบตานี้`);
}
// ตาแทรกจบ (ฮุค onActorEnd) — ล้างสถานะ
function holdEnded(p) {
  const h = match.holdIt;
  if (h && h.lawyerId === p.id) match.holdIt = null;
}
function holdView(viewerId, controlId) {
  const h = match.holdIt;
  if (!h) return null;
  const ids = [viewerId, controlId].filter(Boolean);
  const actor = match.players[h.actorId];
  return {
    seq: h.seq, lawyerId: h.lawyerId, actorId: h.actorId, phase: h.phase, deadline: h.deadline, result: h.result || null,
    canAlibi: h.phase === "alibi" && !!actor && (ids.includes(h.actorId) || ids.includes(actorOf(actor).id)) && (actorOf(actor).courtAlibi || 0) > 0 && !h.alibiUsed,
  };
}

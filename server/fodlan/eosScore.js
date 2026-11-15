// ============================================================
//  สนาม Eos — ฝ่าย/สี · ยึดเสา (ร่าย/หลุด) · แต้มรวม/ผลแพ้ชนะ · สรุปจบเกม · ล้มแล้วฟื้น
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const E = require("./eosEvents");
const PKS = require("./eosPerks");
const XT = require("./eosExtra");
const MBS = require("./eosMobs");
const LM = require("./eosLament");
const { SCORE_TABLE, PVE, MOB_SIDE, SEIZE_SECS, isMob, mobsOf, tileFree, freeNear, manhattan, canStrike } = require("./eosCore");
const HH = require("./eosH");
const RD = require("./eosRide");
const SPN = require("./eosSpawn");
const WL = require("./eosWalls");

// ============================================================ ฝ่าย (PVE — ผู้ใช้สั่ง 2026-11-10: ผู้เล่นทุกคนฝ่ายเดียวกัน · มอนเตอร์อีกฝ่าย)
function sideOf(p) {
  if (!p) return null;
  return isMob(p) ? MOB_SIDE : PVE;
}
const PVE_COLOR = "#7fd4ff";
function sideColor(ctx, side) { return side === PVE ? PVE_COLOR : "#b04ad8"; }

// ============================================================ เสายึดพื้นที่ (ร่ายพิธี 2 ตา)
const nextTo = (ctx, p, pl) => !!(p && p.pos) && ctx.Board.dist(ctx.action.boxOf(p), { x: pl.x, y: pl.y }) === 1;
function pillarNear(ctx, s, p) { return s.pillars.find((pl) => nextTo(ctx, p, pl)) || null; }
function breakChannel(ctx, pl) {
  const by = ctx.match.players[pl.ch.by];
  ctx.fx("seize_break", { id: pl.id, x: pl.x, y: pl.y, by: pl.ch.by });
  if (by) ctx.log(`💢 พิธียึดเสาของ ${by.name} แตก!`);
  pl.ch = null;
}
// พิธีแตก: คนร่ายตาย/ออกจากกระดาน/ไม่ติดเสาแล้ว/โดนดาเมจ (เลือด+เกราะลด)
function checkChannels(ctx, s) {
  for (const pl of s.pillars) {
    if (!pl.ch) continue;
    const p = ctx.match.players[pl.ch.by];
    if (!p || !p.alive || !p.pos || !nextTo(ctx, p, pl)) { breakChannel(ctx, pl); continue; }
    const now = RD.markOf(p);
    if (now < pl.ch.mark) breakChannel(ctx, pl);
    else pl.ch.mark = now;
  }
}
function seizeState(ctx, s, p) {
  if (isMob(p) || (p && p.summon && !p.summon.controlled)) return null;
  const pl = pillarNear(ctx, s, p);
  if (!pl) return null;
  if (pl.owner === sideOf(p)) {
    // เสาที่ยึดแล้วแต่โดนมอนตี = ซ่อมได้ (ใช้การตี)
    return { pl, ok: (pl.hits || 0) > 0 && canStrike(ctx, p), repair: true };
  }
  if (pl.ch && pl.ch.by !== p.id) return { pl, ok: false };
  if (pl.ch && pl.ch.round >= ctx.match.roundNumber) return { pl, ok: false }; // ครั้งที่สองได้ตั้งแต่ตาถัดไป
  return { pl, ok: canStrike(ctx, p), second: !!pl.ch };
}
const ZONE_NAMES = { insomnia: "Insomnia", hammerhead: "Hammerhead", duscae: "Duscae", lake: "Cleigne", altissia: "Altissia" };
function seize(ctx, s, p) {
  checkChannels(ctx, s);
  const st0 = seizeState(ctx, s, p);
  if (!st0 || !st0.ok) return false;
  const pl = st0.pl;
  ctx.match.action.locked = true;
  if (st0.repair) {
    pl.hits = 0;
    ctx.fx("pillar_repair", { id: pl.id, x: pl.x, y: pl.y, by: p.id });
    ctx.log(`🔧 ${p.name} ซ่อมเสา ${ZONE_NAMES[pl.zone] || ""}`);
    XT.stat(s, p.id, "guard");
  } else if (!st0.second) {
    pl.ch = { by: p.id, side: sideOf(p), round: ctx.match.roundNumber, mark: RD.markOf(p) };
    ctx.fx("seize_start", { id: pl.id, x: pl.x, y: pl.y, by: p.id, color: sideColor(ctx, sideOf(p)) });
    ctx.log(`🔷 ${p.name} เริ่มร่ายพิธียึดเสา ${ZONE_NAMES[pl.zone] || ""}`);
  } else {
    const was = pl.owner;
    pl.owner = pl.ch.side; pl.ch = null; pl.hits = 0;
    ctx.fx("seize_done", { id: pl.id, x: pl.x, y: pl.y, by: p.id, from: was, color: sideColor(ctx, pl.owner) });
    ctx.log(`🔷 ${p.name} ยึดเสา ${ZONE_NAMES[pl.zone] || ""} ได้!`);
    XT.stat(s, p.id, "guard", 2);
  }
  ctx.useStrike(p, SEIZE_SECS);
  return true;
}
const heldCount = (s) => s.pillars.filter((pl) => pl.owner === PVE).length;
const rateOf = (n) => SCORE_TABLE[Math.min(n, SCORE_TABLE.length - 1)] || 0;
// จบเทิร์น: แต้มรวมตามจำนวนเสาที่ผู้เล่นถือ → ถึง SCORE_GOAL = ทุกคนชนะ
function scoreRound(ctx, s) {
  const n = heldCount(s), add = rateOf(n);
  s.lastGain = add;
  if (add > 0) {
    s.score = (s.score || 0) + add;
    ctx.fx("score", { gains: [{ side: PVE, add, total: s.score, color: PVE_COLOR }], held: n, total: s.score, goal: E.goalOf(ctx) });
  }
  checkWin(ctx, s);
  E.onScore(ctx, s, HH.H()); // แต้มรวมถึงครึ่ง = ราชาปีศาจครั้งแรก
  XT.onScore(ctx, s, HH.H());
  LM.onScore(ctx, s, HH.H()); // Lament: แต้มรวม 90 = ผู้คร่ำครวญ // แต้มรวมถึง 40 = คืนสุดท้าย
  PKS.onScore(ctx, s); // แต้มรวมถึง 10/20/30 = โหวตการ์ดอัปเกรดทีม
}
function checkWin(ctx, s) {
  if (s.score >= E.goalOf(ctx) && !s.result && LM.blocksWin(ctx, s, HH.H())) return; // Lament: ต้องล้มผู้คร่ำครวญก่อน
  if (s.score >= E.goalOf(ctx) && !s.result) {
    s.result = "win";
    ctx.log(`🏆 แต้มรวมครบ ${E.goalOf(ctx)} — ปกป้อง Eos สำเร็จ!`);
  }
}
// แต้มรวมโบนัส (บอส · ภารกิจ · ขบวนเสบียง)
function addScore(ctx, s, n, why) {
  s.score = (s.score || 0) + n;
  ctx.fx("score_bonus", { add: n, total: s.score, why, goal: E.goalOf(ctx) });
  checkWin(ctx, s);
  E.onScore(ctx, s, HH.H());
  XT.onScore(ctx, s, HH.H());
  LM.onScore(ctx, s, HH.H()); // Lament: แต้มรวม 90 = ผู้คร่ำครวญ
  PKS.onScore(ctx, s);
}
// ผลแมตช์ (phases/endTurn.js gameOver): "win" = แต้มครบ · "lose" = ผู้เล่นล้มหมดพร้อมกัน (ไม่มีใครเหลือรอเพื่อนฟื้น)
function outcome(ctx, st) {
  const s = st && st.eos;
  if (!s) return null;
  if (s.result) return s.result;
  const people = Object.values(ctx.match.players).filter((u) => !u.summon);
  if (people.length && people.every((u) => !u.alive)) {
    s.result = "lose";
    ctx.log("🌑 ผู้เล่นล้มหมดทุกคน — Eos ถูกความมืดกลืนกิน");
  }
  return s.result;
}
// เดิม (โหมดแข่ง) — คงไว้ให้ fodlan.eosWinner: ชนะ = ผู้เล่นคนแรก (ทั้งทีมชนะ)
function winner(ctx, st) {
  const s = st && st.eos;
  if (!s || s.result !== "win") return null;
  const p = Object.values(ctx.match.players).find((u) => !u.summon && !u.duoOf);
  return p ? p.id : null;
}

// ============================================================ ตายแล้วฟื้น (หลัง 3 เทิร์น — จุดเกิดที่ไกลมอนเตอร์สุด)
// สรุปจบเกม Eos (ผู้ใช้สั่ง 2026-11-12 "ทำทั้งหมด"): ดาเมจที่มอนแต่ละชนิดทำใส่ทีม · ใครล้มกี่ครั้ง เพราะอะไร · ใครล้มหัวหน้า/บอส
const SUM = (s) => (s.sum ||= { mobDmg: {}, last: {}, deaths: {}, causes: {}, elites: {}, bosses: {} });
function mobKey(m) { const tr = m.summon.trait, type = SPN.mobType(m); return { key: tr || type, name: (tr && (MBS.nameOf(type, tr) || SPN.TRAIT_NAMES[tr])) || SPN.MOB_NAMES[type] || m.name }; }
function sumHit(s, p, src, n) {
  if (!(n > 0) || !p || isMob(p)) return;
  const k = mobKey(src), S = SUM(s);
  const row = (S.mobDmg[k.key] ||= { key: k.key, name: k.name, n: 0 });
  row.n += n;
  S.last[p.id] = k.key;
}
function publicSum(ctx, s) {
  const S = SUM(s);
  return { turns: ctx.match.roundNumber, mobDmg: Object.values(S.mobDmg).sort((a, b) => b.n - a.n).slice(0, 5), deaths: S.deaths, causes: S.causes, elites: S.elites, bosses: S.bosses };
}
function noteDeaths(ctx, s) {
  for (const p of Object.values(ctx.match.players)) {
    if (p.summon || p.alive) { delete s.dead[p.id]; continue; }
    if (s.dead[p.id] == null) {
      s.dead[p.id] = ctx.match.roundNumber;
      { const S = SUM(s); S.deaths[p.id] = (S.deaths[p.id] || 0) + 1; const c = S.last[p.id]; if (c) (S.causes[p.id] ||= {})[c] = ((S.causes[p.id] || {})[c] || 0) + 1; }
      PKS.noteDown(s);
      const back = LM.onDown(ctx, s, p); // Lament: ชีวิตทีม (หมดแล้ว = ไม่ฟื้นเอง) // ดาวท้าทาย "ไม่มีใครล้ม"
      ctx.log(back ? `🕯️ ${p.name} ล้มลง — ฟื้นในอีก ${WL.reviveTurns(s)} เทิร์น` : `🕯️ ${p.name} ล้มลง`);
    }
  }
}
function reviveSpot(ctx, s, p) {
  const map = ctx.map();
  const foes = mobsOf(ctx);
  const list = (map.spawns || []).map((sp) => ({ x: sp.x, y: sp.y, d: foes.length ? Math.min(...foes.map((u) => manhattan(u.pos, sp))) : 0 }))
    .sort((a, b) => b.d - a.d);
  for (const sp of list) {
    const spot = tileFree(ctx, s, sp.x, sp.y, p.id) ? { x: sp.x, y: sp.y } : freeNear(ctx, s, sp.x, sp.y, 3, p.id);
    if (spot) return spot;
  }
  return null;
}

// ฟื้นผู้เล่นที่ spot (ฟื้นตามเวลา / ขนนกคืนชีพ) · hp = เลือดตอนฟื้น (ไม่ส่ง = เต็ม)
function raise(ctx, s, p, spot, hp) {
  const pid = p.id;
  E.onRevived(s, pid);
  p.alive = true; p.result = null; p.locked = false;
  p.statuses = {}; p.statusAmt = {};
  p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0; p.mountId = null; p.wasAttacked = false; p.corpseKeeper = null;
  p.corpse = null;
  p.boardSize = 1;
  if (ctx.combat.respawnReset) ctx.combat.respawnReset(p); // เกิดใหม่: ของที่ใช้ได้ครั้งเดียวต่อเกมกลับมาใช้ได้ (ผู้ใช้สั่ง 2026-11-11)
  p.hp = hp != null ? Math.max(1, Math.min(ctx.combat.maxHpOf(p), hp)) : ctx.combat.maxHpOf(p);
  p.armor = ctx.combat.maxArmorOf(p);
  p.pos = spot;
  delete s.dead[pid];
}
function reviveDue(ctx, s) {
  const turn = ctx.match.roundNumber + 1, back = [];
  for (const [pid, r] of Object.entries(s.dead)) {
    const p = ctx.match.players[pid];
    if (!p || p.alive || p.summon || LM.gone(s, pid) || turn < r + WL.reviveTurns(s)) continue; // Lament: ชีวิตทีมหมดตอนล้ม = ไม่ฟื้นเอง
    const spot = E.helpedSpot(ctx, s, HH.H(), p) || reviveSpot(ctx, s, p); // ถูกเพื่อนช่วย = ฟื้นข้างดวงวิญญาณ
    if (!spot) continue;
    raise(ctx, s, p, spot);
    LM.onRespawn(s, pid);
    back.push({ id: p.id, x: spot.x, y: spot.y });
    ctx.log(`✨ ${p.name} ฟื้นคืนชีพ!`);
  }
  if (back.length) { ctx.bump(); ctx.fx("revive", { list: back }); }
  return back.length;
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  sideOf, sideColor, breakChannel, checkChannels, seizeState, ZONE_NAMES, seize, heldCount, rateOf, scoreRound, checkWin, addScore, outcome,
  winner, SUM, sumHit, publicSum, noteDeaths, raise, reviveDue,
});

// ============================================================
//  แม็กน่า สวิง (Black Clover) — id "magna" · กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.35 (2026-11-18)
//
//  ค่าพื้นฐาน: HP 7 / เกราะ 3 (+ โบนัสกลาง) · แต้ม 0/8 · เดิน 4 · ตีประชิด [1, 1] (OverHeat 3+ = [1, 2])
//  ธาตุไฟทุกการกระทำ (ตีปกติ + ทุกสกิล)
//
//  ติดตัว Soul vow Blazing — OverHeat 0–8:
//    สร้างความเสียหาย = +1 ต่อการโจมตี 1 ครั้ง (ตีปกติ · ตีสวน · สกิล — ไม่นับลุกไหม้ที่ติกเอง) · ทั้งเทิร์นไม่สร้างความเสียหาย = −1 ตอนจบเทิร์น
//    3+ ระยะตี +1 · 5+ ตอนสร้างความเสียหาย 20% ลุกไหม้ 1 (ติดโซ่อยู่ 40%) · 8 = ความเสียหายที่ได้รับ −1 ต่อครั้ง
//    ลบสกิลติดตัว: ไม่เพิ่ม/ไม่ลด · ไม่มีผลทั้งหมด (ค่าค้างไว้)
//  สกิลพื้นฐาน Fire Ball (1 แต้ม): บอลไฟ +1 ลูก (เก็บได้ 3)
//    ติดโซ่ = Fire Knuckle (2 แต้ม · คูลดาวน์ 5): ไม่กินโควตาสกิล + ยังเดินได้ · ตีปกติใน 4 เทิร์นติดลุกไหม้ 1
//  สกิลรอง Baseball bat (ลูกละ 2 แต้ม · คูลดาวน์ 3 · แนว 4×1): ตีบอลไฟ 1–2 ลูก ใส่ศัตรูคนแรกในแนว ลูกละ 1 (ทอยหลบแยกลูก · เกราะก่อน)
//    ติดโซ่ = Fire Boost (4 แต้ม · คูลดาวน์ 4 · ยังเดินได้): 2 เทิร์น ตีปกติได้ 2 ครั้งต่อตาเดิน + หลบหลีก 35%
//  ท่าไม้ตาย Soul Chain Deathmatch (6 แต้ม + บอลไฟ 1 · แนว 4×1): ปาบอลไฟใส่ศัตรูคนแรกในแนว (ไม่มีดาเมจ · หลบได้)
//    โดน = คลิป → โซ่ 5 เทิร์น (server/soulChain.js) · คูลดาวน์ 5 เทิร์นนับหลังโซ่หาย (หลบพ้น = นับเลย)
//    ติดโซ่ = Soul Chain Finisher (5 แต้ม + OverHeat 8 ทั้งหมด): โซ่ไม่หายจนท่านี้ทำงาน
//      แบบ 1: คู่โซ่ทำให้เสียหาย/ตีใส่ = ยกเลิกทั้งก้อน → คลิป → เสียหาย 3 คงที่ (หลบได้) → ติดตัว = ผลักออก 5
//      แบบ 2: ต้นตาเดินถัดไปของแม็กน่า → คลิป → ดึงมาติดตัว → เสียหาย 3 คงที่ → ผลัก 5 → ฟื้นพลังชีวิตตามลุกไหม้บนเป้า (1–2 = 1 · 3–4 = 2 · 5–6 = 3)
//      ทำงานแล้วโซ่ขาด (ก่อนผลัก — ไม่ติดสายจูง)
// ============================================================
const PassiveSeal = require("../server/passiveSeal");
const Board = require("../server/board");
const Chain = require("../server/soulChain");
const boxOf = (u) => require("../server/phases/action").boxOf(u);

const ID = "magna";
const DIR = "/characters/magna";
const IMG = {
  base: `${DIR}/magna.webp`,
  ball: `${DIR}/fireball.webp`,
  knuckle: `${DIR}/knuckle.webp`,
  bat: `${DIR}/bat.webp`,
  boost: `${DIR}/boost.webp`,
  deathmatch: `${DIR}/deathmatch.webp`,
  finisher: `${DIR}/finisher.webp`,
};
// ไฟล์ใน zip ชื่อสลับกับเนื้อหา (ผู้ใช้ 2026-11-19): deathmatch.mp4 = โซ่เริ่มเชื่อม (เดิม Soul_Chain_Finisher.mp4) · finisher.mp4 = เดิม Soul_Chain_Deathmatch.mp4
const VIDEO = { deathmatch: `${DIR}/deathmatch.mp4`, finisher: `${DIR}/finisher.mp4` };
const CUT = { deathmatch: "magnaDeathmatch", finisher: "magnaFinisher" };
const CLIP_SEC = { deathmatch: 6.1, finisher: 9.4 };
const FX = "magnaFx";
// เสียง (client/src/audio.js — สังเคราะห์ .claude/plans/magna-sfx.py · ยังไม่มีคนฟัง) · action ที่มีคลิป = ไม่มีเสียงก่อน/ซ้อนคลิป
const SFX = {
  swing: "magna_swing", knuckle: "magna_knuckle", ball: "magna_ball", bat: "magna_bat", batHit: "magna_bat_hit",
  boost: "magna_boost", throw: "magna_throw", arm: "magna_arm", chainBreak: "magna_chain_break", pull: "magna_pull",
};
const PASSIVE = "Soul vow Blazing";
const NAME = {
  ball: "Fire Ball", knuckle: "Fire Knuckle", bat: "Baseball bat", boost: "Fire Boost",
  deathmatch: "Soul Chain Deathmatch", finisher: "Soul Chain Finisher",
};
const HEAT = { max: 8, range: 3, burn: 5, guard: 8, burnPct: 20 };
const BALL_MAX = 3;
const KNUCKLE = { cost: 2, cd: 5, turns: 4, burn: 1 };
const BAT = { cd: 3, per: 2, dmg: 1, area: { kind: "line", len: 4, width: 1, hostile: true } };
const BOOST = { cost: 4, cd: 4, turns: 2, evade: 35 };
const ULT = { cost: 6, cd: 5, turns: 5, area: { kind: "line", len: 4, width: 1, hostile: true } };
const FIN = { cost: 5, dmg: 3, push: 5 };
// จังหวะฉาก (วินาที) — client MAGNA_T (ms) ต้องตรงกัน
const T = { bat: 0.55, throw: 0.6, pull: 0.55, finHit: 0.5 };

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
const matchOf = () => require("../server/match");
const round = () => matchOf().roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const passiveOn = (p) => PassiveSeal.on(p);
function fresh() {
  return {
    heat: 0, heatKey: null, dealtRound: -1,
    balls: 0,
    batReady: 0,
    knuckleReady: 0, knuckleEnd: 0, knuckleSever: 0,
    boostReady: 0, boostEnd: 0, boostUsed: -1, boostSever: 0,
    ultReady: 0, chainWith: null, chainEnd: 0, chainSever: 0,
    fin: null, // { armed: เทิร์นที่กด, at: severStamp, firing }
  };
}
function st(p) { return p.magna || (p.magna = fresh()); }
const chained = (p) => isMe(p) && !!st(p).chainWith && Chain.linked(p);
const partner = (p) => (chained(p) ? Chain.partnerOf(p) : null);
const knuckleOn = (p, r = round()) => isMe(p) && r < st(p).knuckleEnd;
const boostOn = (p, r = round()) => isMe(p) && r < st(p).boostEnd;
const heatOf = (p) => (isMe(p) ? st(p).heat : 0);

// ---------- เอฟเฟกต์ ----------
function fx(engine, p, kind, extra = {}) {
  engine.boardFx(FX, { kind, id: p.id, at: p.pos ? { ...p.pos } : null, ...extra });
}
const tileOf = (u) => (u && u.pos ? { x: u.pos.x, y: u.pos.y } : null);

// ---------- ดาเมจตายตัว (หลบได้ · เกราะก่อน · ฆ่าได้) ----------
function fixedHit(engine, p, t, n, name) {
  if (!t || !t.alive || !t.pos) return { dmg: 0, dodge: false };
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, name)) return { dmg: 0, dodge: true };
  const block = engine.attackBlocked ? engine.attackBlocked(t, p) : null;
  if (block) { engine.log(`🛡️ ${t.name} ${block.name} — กัน${name}ของ ${p.name}`); return { dmg: 0, dodge: false, blocked: true }; }
  const before = (t.hp || 0) + (t.armor || 0) + (t.shield || 0);
  engine.dealMixed(t, n, false);
  const after = (t.hp || 0) + (t.armor || 0) + (t.shield || 0);
  engine.log(`${p.name} ${name} → ${t.name} -${n} (ลดเกราะก่อน)`);
  if (t.alive && t.hp <= 0) {
    engine.instantDeath(t);
    if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
  }
  if (!t.alive) t.pos = null;
  return { dmg: Math.max(0, before - after), dodge: false };
}

// ศัตรูคนแรกในแนว (ใกล้สุดตามทิศ · เท่ากัน = ใกล้แนวกลาง)
function firstFoe(engine, p, targets, dir) {
  const v = Board.LINE_DIRS[dir];
  if (!v || !p.pos) return null;
  const foes = (targets || []).map((id) => engine.players[id])
    .filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  const along = (t) => {
    const dx = Board.wdx ? Board.wdx(p.pos.x, t.pos.x) : t.pos.x - p.pos.x, dy = t.pos.y - p.pos.y;
    return { a: dx * v[0] + dy * v[1], s: Math.abs(dx * -v[1] + dy * v[0]) };
  };
  return foes.map((t) => ({ t, ...along(t) })).sort((x, y) => x.a - y.a || x.s - y.s || (x.t.id < y.t.id ? -1 : 1))[0]?.t || null;
}
function lineOf(engine, p, area, dir) {
  return p.pos && Board.LINE_DIRS[dir] ? Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, area.len, area.width, engine.sizeOf(p)) : [];
}

// ---------- สกิล ----------
function castBall(engine, p) {
  const s = st(p);
  s.balls = Math.min(BALL_MAX, s.balls + 1);
  fx(engine, p, "ball", { balls: s.balls });
  engine.log(`🔥 ${p.name} ${NAME.ball} — บอลไฟ ${s.balls}/${BALL_MAX}`);
  return ` (${s.balls}/${BALL_MAX})`;
}
function castKnuckle(engine, p) {
  const s = st(p), r = engine.roundNumber;
  s.knuckleEnd = r + KNUCKLE.turns;
  s.knuckleReady = r + KNUCKLE.cd;
  s.knuckleSever = engine.severStamp();
  fx(engine, p, "knuckle");
  engine.log(`🔥 ${p.name} ${NAME.knuckle} — ตีปกติติดลุกไหม้ ${KNUCKLE.turns} เทิร์น`);
  return "";
}
function castBoost(engine, p) {
  const s = st(p), r = engine.roundNumber;
  s.boostEnd = r + BOOST.turns;
  s.boostReady = r + BOOST.cd;
  s.boostUsed = -1;
  s.boostSever = engine.severStamp();
  fx(engine, p, "boost");
  engine.log(`🔥 ${p.name} ${NAME.boost} — ตีปกติ 2 ครั้ง + หลบหลีก ${BOOST.evade}% ${BOOST.turns} เทิร์น`);
  return "";
}
function castBat(engine, p, n, targets, dir) {
  const s = st(p), r = engine.roundNumber;
  s.balls = Math.max(0, s.balls - n);
  s.batReady = r + BAT.cd;
  const t = firstFoe(engine, p, targets, dir);
  const tiles = lineOf(engine, p, BAT.area, dir);
  const to = t ? tileOf(t) : tiles[tiles.length - 1] || null;
  fx(engine, p, "bat", { n, dir, to, tiles, target: t ? t.id : null });
  engine.log(`⚾ ${p.name} ${NAME.bat} — ตีบอลไฟ ${n} ลูก${t ? ` ใส่ ${t.name}` : ""}`);
  engine.skillBeat(T.bat, () => {
    if (!t || !p.alive) return;
    const hits = [];
    engine.withEffectSource(p, () => {
      for (let i = 0; i < n && t.alive && t.pos; i++) {
        const res = fixedHit(engine, p, t, BAT.dmg, NAME.bat);
        hits.push({ dodge: res.dodge, dmg: res.dmg });
      }
    });
    fx(engine, p, "batHit", { to: tileOf(t) || to, target: t.id, hits });
    if (hits.some((h) => h.dmg > 0)) engine.sfx(SFX.batHit);
  });
  return ` (${n} ลูก)`;
}
function castDeathmatch(engine, p, targets, dir) {
  const s = st(p), r = engine.roundNumber;
  s.balls = Math.max(0, s.balls - 1);
  const t = firstFoe(engine, p, targets, dir);
  const tiles = lineOf(engine, p, ULT.area, dir);
  if (!t) { s.ultReady = r + ULT.cd; return ""; }
  t.wasAttacked = true;
  const dodged = engine.withEffectSource(p, () => engine.skillDodge(p, t, NAME.deathmatch));
  fx(engine, p, "throw", { dir, to: tileOf(t), tiles, target: t.id, miss: dodged });
  if (dodged) {
    s.ultReady = r + ULT.cd;
    engine.log(`⛓️ ${t.name} หลบ ${NAME.deathmatch} ของ ${p.name} ได้`);
    return "";
  }
  // โดน: คลิป → โซ่ติด (ผลหลังคลิปจบ — ไม่มีเสียงเอฟเฟกต์ซ้อนคลิป)
  engine.skillBeat(T.throw, () => {
    engine.queueCutscene(p, CUT.deathmatch);
    engine.deferAfterCutscene(() => engine.withEffectSource(p, () => linkTo(engine, p, t)));
  });
  return "";
}
function linkTo(engine, p, t) {
  if (!p.alive || !t || !t.alive || !t.pos || !p.pos) { st(p).ultReady = engine.roundNumber + ULT.cd; return; }
  if (Chain.linked(t) || Chain.linked(p)) { st(p).ultReady = engine.roundNumber + ULT.cd; return; }
  const s = st(p), r = engine.roundNumber;
  Chain.link(p, t, engine.severStamp());
  s.chainWith = t.id;
  s.chainEnd = r + ULT.turns;
  s.chainSever = p.soulChain ? p.soulChain.at : engine.severStamp();
  s.fin = null;
  fx(engine, p, "link", { to: tileOf(t), target: t.id });
  engine.log(`⛓️ ${p.name} ${NAME.deathmatch} — เชื่อมโซ่กับ ${t.name} ${ULT.turns} เทิร์น`);
}
// โซ่หาย (ครบเวลา/ตาย/Finisher/ถูกตัด) → คูลดาวน์ท่าไม้ตายเริ่มนับ
function endChain(engine, p, why) {
  const s = st(p);
  if (!s.chainWith) return;
  const q = engine.players[s.chainWith];
  Chain.unlinkOf(p.id);
  if (p.soulChain) Chain.unlink(p);
  s.chainWith = null;
  s.fin = null;
  s.ultReady = (why === "time" ? engine.roundNumber + 1 : engine.roundNumber) + ULT.cd;
  fx(engine, p, "unlink", { to: tileOf(q), target: q ? q.id : null });
  const msg = { time: "ครบเวลา", death: "มีคนตกรอบ", finisher: NAME.finisher, sever: "ถูกตัด" }[why] || "";
  engine.log(`⛓️ โซ่ของ ${p.name}${q ? ` กับ ${q.name}` : ""} ขาด${msg ? ` (${msg})` : ""}`);
}
function castFinisher(engine, p) {
  const s = st(p);
  s.heat = 0;
  s.fin = { armed: engine.roundNumber, at: engine.severStamp(), firing: false };
  const q = partner(p);
  fx(engine, p, "arm", { to: tileOf(q), target: q ? q.id : null });
  engine.log(`⛓️ ${p.name} ${NAME.finisher} — รอจังหวะ`);
  return "";
}
// ยิง Finisher: mode "counter" (คู่โซ่โจมตีใส่) / "pull" (ต้นตาเดินถัดไป)
function fireFinisher(engine, p, mode) {
  const s = st(p);
  if (!s.fin || s.fin.firing) return false;
  s.fin.firing = true;
  engine.queueCutscene(p, CUT.finisher);
  engine.deferAfterCutscene(() => engine.withEffectSource(p, () => landFinisher(engine, p, mode)));
  return true;
}
function landFinisher(engine, p, mode) {
  const t = partner(p);
  if (!p.alive || !p.pos || !t || !t.alive || !t.pos) { endChain(engine, p, "finisher"); return; }
  if (mode === "pull") {
    const to = pullSpot(engine, p, t);
    if (to) {
      const from = { ...t.pos };
      t.pos = { ...to };
      engine.ice.revealPushed(t);
      fx(engine, p, "pull", { from, to: { ...to }, target: t.id });
    }
    engine.skillBeat(T.pull, () => engine.withEffectSource(p, () => finisherHit(engine, p, t, mode)));
    return;
  }
  finisherHit(engine, p, t, mode);
}
// ช่องว่างติดตัวแม็กน่าที่ใกล้เป้าสุด (ยืนอยู่แล้ว = ไม่ขยับ)
function pullSpot(engine, p, t) {
  if (Board.dist(boxOf(p), boxOf(t)) <= 1) return null;
  const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    .map(([dx, dy]) => ({ x: Board.wx ? Board.wx(p.pos.x + dx) : p.pos.x + dx, y: p.pos.y + dy }))
    .filter((c) => engine.tileFree(c.x, c.y, t.id));
  opts.sort((a, b) => (Math.abs(a.x - t.pos.x) + Math.abs(a.y - t.pos.y)) - (Math.abs(b.x - t.pos.x) + Math.abs(b.y - t.pos.y)));
  return opts[0] || null;
}
// ช่องติดตัวเต็ม → ช่องว่างที่ใกล้แม็กน่าที่สุดในระยะสายจูง (ไล่วงข้าวหลามตัด)
function nearSpot(engine, p, t) {
  if (Board.dist(boxOf(p), boxOf(t)) <= Chain.LEASH) return null;
  for (let r = 2; r <= Chain.LEASH; r++) {
    for (let dy = -r; dy <= r; dy++) {
      const w = r - Math.abs(dy);
      for (const dx of w ? [-w, w] : [0]) {
        const c = { x: Board.wx ? Board.wx(p.pos.x + dx) : p.pos.x + dx, y: p.pos.y + dy };
        if (engine.tileFree(c.x, c.y, t.id)) return c;
      }
    }
  }
  return null;
}
function finisherHit(engine, p, t, mode) {
  if (!p.alive || !t || !t.alive || !t.pos) { endChain(engine, p, "finisher"); return; }
  const burn = (t.statuses && t.statuses.hburn) || 0;
  fx(engine, p, "finHit", { to: tileOf(t), target: t.id });
  const res = fixedHit(engine, p, t, FIN.dmg, NAME.finisher);
  endChain(engine, p, "finisher"); // โซ่ขาดก่อนผลัก (ไม่ติดสายจูง 4 ช่อง)
  // ติดตัว (ระยะ 1) = ผลักออก 5
  if (t.alive && t.pos && p.pos && Board.dist(boxOf(p), boxOf(t)) <= 1 && !res.dodge) {
    const dx = Math.sign(Board.wdx ? Board.wdx(p.pos.x, t.pos.x) : t.pos.x - p.pos.x), dy = Math.sign(t.pos.y - p.pos.y);
    if (dx || dy) {
      const ctx = engine.ice.begin();
      engine.ice.pushUnit(t, { x: dx, y: dy }, ctx, FIN.push);
      engine.ice.flush(ctx);
    }
  }
  if (mode === "pull" && burn > 0 && p.alive) {
    const n = burn >= 5 ? 3 : burn >= 3 ? 2 : 1;
    const got = engine.healHp(p, n);
    if (got > 0) engine.log(`❤️‍🔥 ${p.name} ${NAME.finisher} — ฟื้นพลังชีวิต +${got} จากลุกไหม้ ${burn} บน ${t.name}`);
  }
}

// ---------- ป้าย/ปุ่ม ----------
function batChoice(p, n) {
  const s = st(p), cd = cdLeft(s.batReady, round());
  return {
    key: `b${n}`, name: `${NAME.bat} ×${n}`, img: IMG.bat, cost: n * BAT.per, area: BAT.area, cd,
    locked: cd > 0 || s.balls < n,
    desc: `ธาตุไฟ · เลือกทิศ แนว 4×1 · ตีบอลไฟ ${n} ลูกใส่ศัตรูคนแรกในแนว ลูกละ ${BAT.dmg} (หลบได้แยกลูก · ลดเกราะก่อน) (คูลดาวน์ ${BAT.cd} เทิร์น)`,
  };
}
const batN = (opts) => (opts && opts.form === "b2" ? 2 : opts && opts.form === "b1" ? 1 : 0);

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, CLIP_SEC, FX, SFX, NAME, HEAT, BALL_MAX, KNUCKLE, BAT, BOOST, ULT, FIN, T, PASSIVE,
  isMe, chained, heatOf, knuckleOn, boostOn,

  resetCombat(p) {
    p.magna = isMe(p) ? fresh() : null;
  },

  // ---------- ติดตัว Soul vow Blazing ----------
  range(p) {
    if (!isMe(p) || !passiveOn(p) || st(p).heat < HEAT.range) return null;
    return [1, 2];
  },
  // OverHeat +1 ต่อการโจมตี 1 ครั้ง (แยกด้วยเลขคำสั่ง) · 5+ ลุ้นลุกไหม้
  onDamageDealt(engine, src, victim) {
    if (!isMe(src) || !victim || victim.id === src.id || engine.sameTeam(src, victim)) return;
    const s = st(src);
    const key = `${engine.cmdSeq}:${engine.roundNumber}:${engine.actorId || ""}:${victim.id}`;
    const hitKey = `${engine.cmdSeq}:${engine.roundNumber}:${engine.actorId || ""}`;
    s.dealtRound = engine.roundNumber;
    if (!passiveOn(src)) return;
    if (s.heatKey !== hitKey) {
      s.heatPre = s.heat; // ค่าก่อนการโจมตีครั้งนี้ — ใช้ตัดสิน 5+ ลุกไหม้
      s.heatKey = hitKey;
      s.heat = Math.min(HEAT.max, s.heat + 1);
      if (s.heat !== s.heatPre) fx(engine, src, "heat", { heat: s.heat });
    }
    if (s.burnKey === key || !victim.alive) return;
    s.burnKey = key;
    if ((s.heatPre || 0) >= HEAT.burn) {
      const pct = HEAT.burnPct * (chained(src) ? 2 : 1);
      if (Math.random() * 100 < pct) {
        const n = engine.withEffectSource(src, () => engine.applyBurn(victim, 1));
        if (n > 0) engine.log(`🔥 ${src.name} ${PASSIVE} — ${victim.name} ลุกไหม้ (${pct}%)`);
      }
    }
  },
  adjustIncomingDamage(engine, p, n) {
    if (!isMe(p) || !(n > 0) || !passiveOn(p) || st(p).heat < HEAT.guard) return n;
    return n - 1;
  },
  attackElement(engine, p) { return isMe(p) ? "fire" : null; },
  skillElement(engine, p) { return isMe(p) ? "fire" : null; },
  attackStyle(p) { return isMe(p) ? (knuckleOn(p) ? "magnaKnuckle" : "magnaSwing") : null; },
  attackSound(p) { return isMe(p) ? (knuckleOn(p) ? SFX.knuckle : SFX.swing) : undefined; },
  onStrikeLanded(engine, attacker, target) {
    if (!isMe(attacker) || !target || !target.alive || !knuckleOn(attacker)) return [];
    const n = engine.withEffectSource(attacker, () => engine.applyBurn(target, KNUCKLE.burn));
    return n > 0 ? [NAME.knuckle] : [];
  },
  ownEvade(p) { return boostOn(p) ? BOOST.evade : 0; },
  extraStrike(engine, p) {
    if (!boostOn(p)) return false;
    const s = st(p);
    if (s.boostUsed === engine.roundNumber) return false;
    s.boostUsed = engine.roundNumber;
    return true;
  },
  // Finisher แบบ 1: คู่โซ่โจมตีใส่ = ยกเลิกทั้งก้อน แล้วสวน
  blocksAttack(engine, p, attacker) {
    if (!isMe(p) || !st(p).fin || st(p).fin.firing || !attacker) return null;
    const q = partner(p);
    if (!q || q.id !== attacker.id) return null;
    fireFinisher(engine, p, "counter");
    engine.wantFlow();
    engine.log(`⛓️ ${p.name} ${NAME.finisher} — ยกเลิกการโจมตีของ ${attacker.name}`);
    return { name: NAME.finisher, img: IMG.finisher };
  },

  // ---------- ปุ่มสกิล ----------
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    const s = st(p), r = round();
    if (chained(p)) {
      if (tier === "basic") return { name: NAME.knuckle, img: IMG.knuckle, flash: true, desc: `ไม่นับเป็นการใช้สกิล · ใช้แล้วยังเดินได้ · ${KNUCKLE.turns} เทิร์น: ตีปกติติดลุกไหม้ ${KNUCKLE.burn} (คูลดาวน์ ${KNUCKLE.cd} เทิร์น)` };
      if (tier === "secondary") return { name: NAME.boost, img: IMG.boost, flash: true, desc: `ใช้แล้วยังเดินได้ · ${BOOST.turns} เทิร์น: ตีปกติได้ 2 ครั้งต่อตาเดิน · หลบหลีก ${BOOST.evade}% (คูลดาวน์ ${BOOST.cd} เทิร์น)` };
      if (tier === "ultimate") return { name: NAME.finisher, img: IMG.finisher, flash: true, desc: `ใช้ OverHeat 8 ทั้งหมด · โซ่ไม่หายจนท่านี้ทำงาน · คู่โซ่โจมตีใส่ = ยกเลิก แล้วสวนเสียหาย ${FIN.dmg} · ไม่ถูกโจมตี = ต้นตาเดินถัดไปดึงคู่โซ่มาติดตัว เสียหาย ${FIN.dmg} ฟื้นพลังชีวิตตามลุกไหม้บนเป้า (1–2 = 1 · 3–4 = 2 · 5–6 = 3) · ติดตัว = ผลักออก ${FIN.push} ช่อง · โซ่ขาด` };
      return null;
    }
    if (tier === "secondary") return { choices: [batChoice(p, 1), batChoice(p, 2)], cd: cdLeft(s.batReady, r) };
    return null;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isMe(p)) return area;
    if (chained(p)) return { kind: "self" };
    if (tier === "secondary") return BAT.area;
    if (tier === "ultimate") return ULT.area;
    return area;
  },
  skillCost(p, tier, base, opts = {}) {
    if (!isMe(p)) return base;
    if (chained(p)) return tier === "basic" ? KNUCKLE.cost : tier === "secondary" ? BOOST.cost : FIN.cost;
    if (tier === "secondary") return (batN(opts) || 1) * BAT.per;
    return base;
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    if (chained(p)) {
      const kcd = cdLeft(s.knuckleReady, r), bcd = cdLeft(s.boostReady, r);
      return {
        basic: { cd: kcd, locked: kcd > 0 },
        secondary: { cd: bcd, locked: bcd > 0 },
        ultimate: { cd: 0, locked: !!s.fin || s.heat < HEAT.max },
      };
    }
    const bat = cdLeft(s.batReady, r), ult = cdLeft(s.ultReady, r);
    return {
      basic: { cd: 0, locked: s.balls >= BALL_MAX },
      secondary: { cd: bat, locked: bat > 0 || s.balls < 1 },
      ultimate: { cd: ult, locked: ult > 0 || s.balls < 1 },
    };
  },
  skipsTurnQuota(p, tier) { return chained(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return chained(p) && (tier === "basic" || tier === "secondary" || tier === "ultimate"); },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p), r = engine.roundNumber;
    if (chained(p)) {
      if (tier === "basic") return cdLeft(s.knuckleReady, r) === 0;
      if (tier === "secondary") return cdLeft(s.boostReady, r) === 0;
      if (tier === "ultimate") return !s.fin && s.heat >= HEAT.max;
      return false;
    }
    if (tier === "basic") return s.balls < BALL_MAX;
    if (tier === "secondary") {
      const n = batN(opts);
      return n > 0 && s.balls >= n && cdLeft(s.batReady, r) === 0 && !!p.pos;
    }
    if (tier === "ultimate") {
      if (s.balls < 1 || cdLeft(s.ultReady, r) > 0 || !p.pos) return false;
      return !!firstFoe(engine, p, targets, opts.dir); // ต้องมีศัตรูในแนว (ไม่เสียบอลไฟฟรี)
    }
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return "";
    if (chained(p)) {
      if (tier === "basic") return castKnuckle(engine, p);
      if (tier === "secondary") return castBoost(engine, p);
      if (tier === "ultimate") return castFinisher(engine, p);
      return "";
    }
    if (tier === "basic") return castBall(engine, p);
    if (tier === "secondary") return castBat(engine, p, batN(opts), targets, opts.dir);
    if (tier === "ultimate") return castDeathmatch(engine, p, targets, opts.dir);
    return "";
  },
  skillSound(p, tier) {
    if (!isMe(p)) return null;
    if (chained(p)) return tier === "basic" ? SFX.knuckle : tier === "secondary" ? SFX.boost : SFX.arm;
    // Deathmatch: โดน = คลิปตามมา → ห้ามเสียงตัดหน้าคลิป (กฎผู้ใช้ 2026-11-03) · เสียงปา/พลาดเล่นฝั่ง client ตอนเห็นว่าพลาด
    return tier === "basic" ? SFX.ball : tier === "secondary" ? SFX.bat : null;
  },

  // ---------- จังหวะเทิร์น ----------
  onActorReady(engine, p) {
    if (!isMe(p)) return;
    const s = st(p);
    // Finisher แบบ 2: ต้นตาเดินถัดไปหลังกด
    if (s.fin && !s.fin.firing && engine.roundNumber > s.fin.armed && chained(p)) {
      if (fireFinisher(engine, p, "pull")) engine.pausePlayingForCutscene();
    }
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p)) continue;
      const s = st(p);
      // OverHeat −1 เมื่อไม่ได้สร้างความเสียหายครบ 1 เทิร์นเต็ม (ผู้ใช้ 2026-11-19: เทิร์นถัดจากที่ตียังไม่ลด)
      //  ตีเทิร์น r → จบ r และจบ r+1 ไม่ลด → จบ r+2 (ยังไม่ตี) ลด 1 แล้วลดต่อทุกเทิร์น
      if (p.alive && passiveOn(p) && s.heat > 0 && s.dealtRound < engine.roundNumber - 1) {
        s.heat--;
        engine.log(`🔥 ${p.name} ${PASSIVE} — OverHeat ${s.heat}`);
      }
      // โซ่ครบ 5 เทิร์น (Finisher กดแล้ว = รอจนทำงาน)
      if (s.chainWith && !s.fin && engine.roundNumber >= s.chainEnd - 1) endChain(engine, p, "time");
      else if (s.chainWith && !Chain.linked(p)) endChain(engine, p, "death");
    }
  },
  // เปลี่ยนพื้นที่ (แผนที่ใหม่): ทุกคนได้จุดเกิดใหม่ → โซ่ดึงคู่โซ่มาติดตัวแม็กน่า (กันห่างเกินสายจูง)
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.alive || !p.pos) continue;
      const s = st(p);
      const t = s.chainWith && engine.players[s.chainWith];
      if (!t || !t.alive || !t.pos || !Chain.linked(p)) continue;
      const to = pullSpot(engine, p, t) || nearSpot(engine, p, t);
      if (to) t.pos = { ...to };
    }
  },
  onDeath(engine, dead) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p)) continue;
      const s = st(p);
      if (s.chainWith && (p.id === dead.id || s.chainWith === dead.id)) endChain(engine, p, "death");
    }
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive) return [];
    const s = st(p), r = engine.roundNumber, out = [];
    if (s.chainWith) out.push({ key: "chain", label: NAME.deathmatch, at: s.chainSever, cancel: () => endChain(engine, p, "sever") });
    if (s.fin && !s.fin.firing) out.push({ key: "finisher", label: NAME.finisher, at: s.fin.at, cancel: () => { s.fin = null; s.chainEnd = Math.min(s.chainEnd, r + 1); } });
    if (r < s.knuckleEnd) out.push({ key: "knuckle", label: NAME.knuckle, at: s.knuckleSever, cancel: () => { s.knuckleEnd = r; } });
    if (r < s.boostEnd) out.push({ key: "boost", label: NAME.boost, at: s.boostSever, cancel: () => { s.boostEnd = r; } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  magnaState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      heat: s.heat, balls: s.balls, chained: chained(p),
      cool: s.heat > 0 && s.dealtRound < r - 1, sealed: !passiveOn(p), // HUD: จบเทิร์นนี้จะลด 1 ถ้ายังไม่ตี · สกิลติดตัวถูกปิด
      knuckle: knuckleOn(p, r) ? s.knuckleEnd - r : 0,
      boost: boostOn(p, r) ? s.boostEnd - r : 0,
      chain: chained(p) ? Math.max(1, s.chainEnd - r) : 0,
      armed: !!s.fin,
    };
  },
};

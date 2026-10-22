// ============================================================
//  ฟันนี่ วาเลนไทน์ (JoJo Part 7 · สแตนด์ D4C) — พิเศษ · id "funny_valentine" · unique (เล่นได้ 1 คนต่อเกม)
//  กติกาทั้งหมด: GRID_PLAN.md §7.13 (ผู้ใช้ตัดสิน 2026-10-20 + ข้อเสนอของ Claude ที่ผู้ใช้ให้ลงโค้ดไปก่อน) — แหล่งความจริง + สัญญาข้อมูล
//
//  พลังชีวิต 7 · เกราะ 3 · เดิน 4 · ตีปกติ [1, 2] (ประชิด = มีด valKnife · ห่าง 2 = ปืน valGun)
//  หลบสายตา (พื้นฐาน 4 แต้ม): เข้ามิติ "veil:<id>" (server/dimension.js — เดินทะลุ · ล่องหนแตะไม่ได้) 3 เทิร์น · ธงชาติที่ช่องที่เข้า
//    · แต้มสกิล +1 ต่อเทิร์น · กดอีกครั้ง = ออก (0 แต้ม · ไม่กินโควตา) · ครบเวลา = ออกเองตอนจบเทิร์นที่ 3 · คูลดาวน์ 3 เทิร์นนับจากตอนออก
//  ปืนแห่งสันติภาพ (รอง 0 แต้ม · กินโควตา): s1/s2/s3 ยิง 1–3 นัดทิศเดียวกัน แนว 5×1 · ศัตรูคนแรก 1 (เกราะก่อน · หลบได้) · หมด = รีโหลด 5 เทิร์น
//  ธงชาติแห่งสันติภาพ (ท่าไม้ตาย 4 ตัวเลือก · คูลดาวน์แยกแบบละ 3 เทิร์น):
//    parallel (6 · แนว 4×3): ศัตรูในแนว + ตัวเอง → กระดานคู่ขนาน "par:<id>:<n>" · ศัตรูแต่ละคนได้ตัวที่เหมือนกัน (server/summon.js)
//    selves (6): ร่างแยก 3 ตัว (คุมต่อจากตัวจริงแบบระบบคู่ · ตัวละ 20 วิ · อยู่ถึงจบเทิร์นถัดไป) · จบตาทันที
//    know (4 · target รูปเฉพาะ cells): ตัวที่เหมือนเป้าบนชั้นของเป้า · ชน = 2 ทะลุเกราะ
//    justice (4): สุ่มพลังชีวิต 2–4 · เกราะ 1–3 · แต้มสกิล 2–5 + ล้างสถานะทั้งหมด
//  ตัวที่เหมือนกัน: จบตาเดินของเป้า (ฮุค afterActorEnd) = วิ่งเข้าหา (เดิน 5) · ถึงตัว = ชน · ทำลายได้ (พลังชีวิต 3 · เกราะ 2)
//  สันติภาพและความยุติธรรม (ติดตัว): ทำดาเมจจริง = แต้มสกิล +1 ต่อการโจมตี 1 ครั้ง (ฮุค onDamageDealt + engine.cmdSeq)
//
//  ทุกอย่างของตัวจริงเก็บที่ p.valentine · ร่างแยก = ระเบียน characterId เดียวกัน + p.summon (ฮุคต้องแยก isVal / isValUnit)
//  เอฟเฟกต์: engine.boardFx("valentineFx", { kind, id: ตัวจริง, … }) — client/src/board/valentineFx.js (จังหวะ VAL_FX ต้องตรงกัน)
//   เหตุการณ์ของตัวที่เหมือนกัน (doubleSpawn/doubleRun/menger/doubleBreak): id = ตัวเหมือน · ownerId = ตัวจริง
// ============================================================
const Board = require("../server/board");

const ID = "funny_valentine";
const DIR = "/characters/funny_valentine";
const IMG = {
  base: `${DIR}/valentine.webp`,
  skill1: `${DIR}/funny_skill1.webp`,
  skill2: `${DIR}/funny_skill2.jpg`,
  skill3: `${DIR}/funny_skill3.webp`,
};
// เสียงเอฟเฟกต์ (client/src/audio.js — ยังไม่มีไฟล์ = เงียบ · GRID_PLAN §7.13)
const SFX = {
  flag: "val_flag", veilIn: "val_veil_in", veilOut: "val_veil_out", gun: "val_gun", knife: "val_knife",
  reload: "val_reload", empty: "val_empty", parallel: "val_parallel", double: "val_double", menger: "val_menger",
  clones: "val_clones", justice: "val_justice",
};
// เสียงพากย์ (client/src/audio.js FILES · ไฟล์ใน voice/) — ตัวจริงเท่านั้น (ร่างแยก/ตัวเหมือนเงียบ)
//  turn/strike/struck/basic/secondary ผ่านฮุค voiceLines (server/voice.js) · ท่าไม้ตายเล่นตามตัวเลือกเอง (ultimate ว่าง)
const VOICE = {
  turn: ["val_v_turn1", "val_v_turn2", "val_v_turn3", "val_v_turn4"],
  strike: ["val_v_strike1", "val_v_strike2", "val_v_strike3"],
  struck: ["val_v_struck1", "val_v_struck2", "val_v_struck3"],
  veil: ["val_v_veil"], // เข้ามิติเท่านั้น (กดออกไม่พูด)
  secondary: ["val_v_gun"],
  ultimate: [],
};
const VOICE_ULT = {
  parallel: ["val_v_parallel1", "val_v_parallel2"], selves: ["val_v_selves1", "val_v_selves2"],
  know: ["val_v_know"], justice: ["val_v_justice"],
};
const VOICE_EVENT = {
  veilOut: ["val_v_dojaan1", "val_v_dojaan2"], // โผล่จากมิติ (กดออก / ครบเวลา)
  meet: ["val_v_meet", "val_v_savor"],         // ตัวเหมือนชนเป้า
  clonesOut: ["val_v_clones_out"],             // ร่างแยกหมดเวลา
};
// จังหวะเอฟเฟกต์ (ms) — ต้องตรงกับ VAL_FX ใน client/src/board/valentineFx.js (GRID_PLAN §7.13)
const VAL_FX = {
  veilIn: 1100, veilOut: 1000, shotBase: 260, shotPer: 220, reload: 700, parallelIn: 1800, doubleSpawn: 700,
  doubleRunStep: 200, doubleRunBase: 400, menger: 1500, doubleBreak: 900, dimOut: 900, clones: 1400, cloneFade: 700,
  justice: 1600, gain: 600,
};

const HP = 7;
const ARMOR = 3;
const MOV = 4;
const RANGE = [1, 2];
const VEIL = { cost: 4, turns: 3, cd: 3, sp: 1 };
const GUN = { ammo: 3, reload: 5, dmg: 1, len: 5 };
const ULT_CD = 3;
const DOUBLE = { hp: 3, armor: 2, mov: 5 };
const PARALLEL = { cost: 6, len: 4, width: 3, dmg: 4 };
const SELVES = { cost: 6, count: 3, hp: 1, armor: 1, range: [1, 2], dmg: 1, turns: 2, sight: 2 };
const KNOW = { cost: 4, dmg: 2 };
const JUSTICE = { cost: 4, hp: [2, 4], armor: [1, 3], sp: [2, 5] };

// รู้จักตัวเองอย่างแท้จริง: กรอบ 3×3 เริ่มช่องติดตัว ทั้ง 4 ทิศรวมกัน (นับจากช่องของวาเลนไทน์ — area.cells)
const KNOW_CELLS = (() => {
  const out = new Map();
  const add = (dx, dy) => out.set(`${dx},${dy}`, [dx, dy]);
  for (let a = -1; a <= 1; a++) {
    for (let b = 1; b <= 3; b++) { add(a, -b); add(a, b); add(-b, a); add(b, a); }
  }
  return [...out.values()];
})();

const GUN_AREA = { kind: "line", len: GUN.len, width: 1, hostile: true };
const SHOTS = {
  s1: { n: 1, name: "ยิง 1 นัด", desc: `เลือกทิศ แนว ${GUN.len}×1: ศัตรูคนแรกในแนว ความเสียหาย ${GUN.dmg} (เกราะรับก่อน · หลบได้)` },
  s2: { n: 2, name: "ยิง 2 นัด", desc: `เลือกทิศ แนว ${GUN.len}×1 ทั้ง 2 นัดทิศเดียวกัน: แต่ละนัดโดนศัตรูคนแรกในแนว ความเสียหาย ${GUN.dmg} (เกราะรับก่อน · หลบได้)` },
  s3: { n: 3, name: "ยิง 3 นัด", desc: `เลือกทิศ แนว ${GUN.len}×1 ทั้ง 3 นัดทิศเดียวกัน: แต่ละนัดโดนศัตรูคนแรกในแนว ความเสียหาย ${GUN.dmg} (เกราะรับก่อน · หลบได้)` },
};
const SHOT_KEYS = Object.keys(SHOTS);
const ULTS = {
  parallel: {
    name: "จงปลาบปลื้ม", cost: PARALLEL.cost, area: { kind: "line", len: PARALLEL.len, width: PARALLEL.width, hostile: true },
    desc: `เลือกทิศ แนว ${PARALLEL.len}×${PARALLEL.width}: ศัตรูในแนวและตัวเองย้ายไปกระดานคู่ขนาน · ศัตรูแต่ละคนได้ตัวที่เหมือนกันห่าง 1 ช่อง (เดิน ${DOUBLE.mov} · พลังชีวิต ${DOUBLE.hp} · เกราะ ${DOUBLE.armor}) · จบตาเดินของเป้า = ตัวเหมือนวิ่งเข้าหา ถึงตัว = ชน ความเสียหาย ${PARALLEL.dmg} (เกราะรับก่อน) แล้วกลับกระดานหลัก · ทำลายตัวเหมือน = กลับโดยไม่เสียหาย`,
  },
  selves: {
    name: "แด่ตัวฉันทุกคน", cost: SELVES.cost, area: { kind: "self" },
    desc: `เรียกวาเลนไทน์อีก ${SELVES.count} ตัวรอบตัว (พลังชีวิต ${SELVES.hp} · เกราะ ${SELVES.armor} · เดินเท่าตัวจริง · ตีปกติระยะ 2 ความเสียหาย ${SELVES.dmg} · ซื้อของเข้ากระเป๋าตัวจริงได้ · เห็นคนล่องหนในระยะ ${SELVES.sight} · ไม่มีสกิล/ใช้ไอเทม/ตีสวน) อยู่ถึงจบเทิร์นถัดไป · จบตาเดินทันที แล้วคุมร่างแยกทีละตัว (ตัวละ 20 วิ)`,
  },
  know: {
    name: "รู้จักตัวเองอย่างแท้จริง", cost: KNOW.cost, area: { kind: "target", range: 4, cells: KNOW_CELLS, hostile: true },
    desc: `ศัตรู 1 คนในกรอบ 3×3 ติดตัว (4 ทิศ): ตัวที่เหมือนเขาโผล่ห่าง 1 ช่อง (เดิน ${DOUBLE.mov} · พลังชีวิต ${DOUBLE.hp} · เกราะ ${DOUBLE.armor}) · จบตาเดินของเป้า = วิ่งเข้าหา ถึงตัว = ชน ความเสียหาย ${KNOW.dmg} (ทะลุเกราะ)`,
  },
  justice: {
    name: "ความยุติธรรมไม่มีวันตาย", cost: JUSTICE.cost, area: { kind: "self" },
    desc: `ตั้งค่าใหม่แบบสุ่ม: พลังชีวิต ${JUSTICE.hp[0]}–${JUSTICE.hp[1]} · เกราะ ${JUSTICE.armor[0]}–${JUSTICE.armor[1]} · แต้มสกิล ${JUSTICE.sp[0]}–${JUSTICE.sp[1]} · ล้างสถานะทั้งหมด`,
  },
};
const ULT_KEYS = Object.keys(ULTS);

const isVal = (p) => !!p && p.characterId === ID && !p.summon;          // ตัวจริง
const isValUnit = (p) => !!p && p.characterId === ID;                  // ตัวจริง + ร่างแยก
const isDouble = (p) => !!p && !!p.summon && p.summon.kind === "double";
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const tile = (t) => ({ x: t.x, y: t.y });

function fresh() {
  return {
    ammo: GUN.ammo,
    reloadRound: 0,     // กระสุนหมด: เต็มอีกครั้งต้นเทิร์นที่ roundNumber >= ค่านี้
    veil: null,         // อยู่ในมิติหลบสายตา { dim, until, flag: { x, y } } — ออกเองตอนจบเทิร์น until
    veilReady: 0,       // กดหลบสายตาได้อีกเมื่อ roundNumber >= ค่านี้ (ออกเทิร์น N = N + 3)
    ultReady: { parallel: 0, selves: 0, know: 0, justice: 0 },
    parallel: null,     // กระดานคู่ขนานที่เปิดอยู่ (dim id) — เปิดได้ทีละมิติ
    parSeq: 0,
    parallelSever: 0,   // ลำดับตอนเปิดกระดานคู่ขนาน / เรียกร่างแยก (engine.severStamp — ฮุค severables)
    selvesSever: 0,     //  · หลบสายตาเก็บใน veil.sever · ตัวเหมือนของรู้จักตัวเองฯ เก็บใน summon.sever
    gainKey: null,     // สกิลติดตัว: คำสั่งล่าสุดที่ได้แต้มไปแล้ว (engine.cmdSeq)
    win: null,          // สกิลติดตัว: ช่วง "การโจมตี 1 ครั้ง" ที่โมดูลเปิดเอง (ยิงปืน / ตัวเหมือนชน) { hit }
  };
}
function st(p) { return p.valentine || (p.valentine = fresh()); }
const inVeil = (p) => isVal(p) && !!st(p).veil;
// เสียงพากย์ของตัวจริง (สุ่ม 1 คีย์ · คีย์เดียว = ไม่แตะ Math.random)
function speak(engine, p, list) {
  if (!isVal(p) || !p.alive || !list || !list.length) return;
  const key = list.length > 1 ? list[Math.floor(Math.random() * list.length)] : list[0];
  engine.sfx(key, null, { voice: p.id });
}
function fx(engine, p, kind, data) {
  engine.boardFx("valentineFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}
// ตัวจริงที่เป็นเจ้าของหน่วยนี้ (ตัวจริงเอง / ร่างแยก / ตัวที่เหมือนกัน)
function ownerOf(engine, u) {
  if (!u) return null;
  if (u.summon) { const o = engine.players[u.summon.ownerId]; return isVal(o) ? o : null; }
  return isVal(u) ? u : null;
}
// ศัตรูของ p ในชั้นเดียวกัน (ตัวที่เหมือนกัน = ศัตรูของทุกคน)
const foe = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t) && engine.dim.same(p, t);
const vit = (p) => (p.hp || 0) + (p.armor || 0) + (p.tempHp || 0);
const roll = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
function ringTiles(c, r) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    const w = r - Math.abs(dy);
    for (const dx of w ? [-w, w] : [0]) out.push({ x: c.x + dx, y: c.y + dy });
  }
  return out;
}
// ช่องว่างใกล้ c ที่สุดตั้งแต่ระยะ from (ในชั้นของ unit — engine.tileFree นับเฉพาะคนชั้นเดียวกับ unit)
function freeNear(engine, unit, c, from, to = 10) {
  for (let r = from; r <= to; r++) for (const t of ringTiles(c, r)) if (engine.tileFree(t.x, t.y, unit.id)) return t;
  return null;
}
const doublesOn = (engine, targetId) => Object.values(engine.players).filter((d) => isDouble(d) && d.alive && d.summon.targetId === targetId);

// ---------- สกิลติดตัว: สันติภาพและความยุติธรรม ----------
function grant(engine, owner, unit) {
  if (!owner.alive) return;
  const before = owner.skillPoints;
  engine.addSkill(owner, 1, "passive");
  const got = owner.skillPoints - before;
  if (got <= 0) return;
  const at = (unit && unit.pos) || owner.pos;
  if (at) fx(engine, owner, "gain", { at: tile(at), n: got });
  engine.log(`🇺🇸 ${owner.name} สันติภาพและความยุติธรรม — แต้มสกิล +${got}`);
}
// เปิด/ปิดช่วง "การโจมตี 1 ครั้ง" เอง (ยิงหลายนัดในการกดครั้งเดียว / ตัวเหมือนชน) → ปิดแล้วได้ +1 ถ้ามีดาเมจจริง
function openWin(s) { s.win = { hit: false }; }
function closeWin(engine, owner, unit) {
  const s = st(owner);
  const hit = !!(s.win && s.win.hit);
  s.win = null;
  if (hit) grant(engine, owner, unit);
}

// ---------- หลบสายตา ----------
function enterVeil(engine, p) {
  const s = st(p);
  const dim = `veil:${p.id}`;
  engine.dim.enter(p, dim, { ghost: true });
  s.veil = { dim, until: engine.roundNumber + VEIL.turns - 1, flag: tile(p.pos), sever: engine.severStamp() };
  fx(engine, p, "veilIn", { at: tile(p.pos), flag: tile(p.pos) });
  engine.sfx(SFX.flag);
  engine.sfx(SFX.veilIn);
  engine.log(`🏳️ ${p.name} หลบสายตา — ธงชาติปักลงพื้น`);
  engine.skillBeat(VAL_FX.veilIn / 1000, () => {});
}
// ออกจากมิติ (กดปุ่ม / ครบเวลา / เปลี่ยนแผนที่) → ช่องที่ยืน (ไม่ว่าง = ช่องว่างใกล้สุด) · คูลดาวน์เริ่มนับ → วินาทีของฉาก
function exitVeil(engine, p) {
  const s = st(p);
  if (!s.veil) return 0;
  const from = s.veil.flag;
  s.veil = null;
  s.veilReady = engine.roundNumber + VEIL.cd;
  if (p.dim) engine.dim.leave(p);
  if (!p.alive || !p.pos) return 0;
  fx(engine, p, "veilOut", { from, at: tile(p.pos) });
  engine.sfx(SFX.veilOut);
  speak(engine, p, VOICE_EVENT.veilOut);
  engine.log(`🏳️ ${p.name} โผล่ออกมาจากหลังธงชาติ`);
  return VAL_FX.veilOut / 1000;
}

// ---------- ปืนแห่งสันติภาพ ----------
// ศัตรูคนแรกในแนว (ทะลุสิ่งกีดขวาง/พวกเดียวกัน — สิ่งกีดขวางไม่บังการโจมตี) → { hit, end, tiles }
function lineShot(engine, p, dir) {
  const tiles = engine.chargeTiles(p, dir, GUN.len);
  for (const t of tiles) {
    const u = t.unitId ? engine.players[t.unitId] : null;
    if (foe(engine, p, u)) return { hit: u, end: tile(t), tiles };
  }
  return { hit: null, end: tiles.length ? tile(tiles[tiles.length - 1]) : tile(p.pos), tiles };
}
function shoot(engine, p, n, dir) {
  const s = st(p);
  const shots = [], hitIds = [];
  let tiles = [];
  openWin(s);
  for (let i = 0; i < n && s.ammo > 0; i++) {
    s.ammo--;
    const r = lineShot(engine, p, dir);
    tiles = r.tiles;
    const t = r.hit;
    if (!t) { shots.push({ to: r.end, hitId: null, miss: false }); continue; }
    t.wasAttacked = true;
    hitIds.push(t.id);
    if (engine.skillDodge(p, t, "ปืนแห่งสันติภาพ")) { shots.push({ to: tile(t.pos), hitId: t.id, miss: true }); continue; }
    const at = tile(t.pos);
    const before = vit(t);
    engine.dealMixed(t, GUN.dmg, false);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
    engine.log(`🔫 ${p.name} ปืนแห่งสันติภาพ → ${t.name} -${Math.max(0, before - vit(t))} (ลดเกราะก่อน)`);
    if (!t.alive) { t.pos = null; if (!t.summon) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
    shots.push({ to: at, hitId: t.id, miss: false });
  }
  engine.hitArea(p, tiles, [...new Set(hitIds)]);
  fx(engine, p, "shots", { from: tile(p.pos), dir, shots });
  engine.sfx(SFX.gun);
  if (!hitIds.length) engine.log(`🔫 ${p.name} ยิงปืนแห่งสันติภาพ ${shots.length} นัด — ไม่โดนใคร`);
  if (s.ammo <= 0) {
    s.reloadRound = engine.roundNumber + GUN.reload;
    engine.sfx(SFX.empty);
    engine.log(`🔫 ${p.name} กระสุนหมด — รีโหลด ${GUN.reload} เทิร์น`);
  }
  closeWin(engine, p, p);
  engine.skillBeat((VAL_FX.shotBase + VAL_FX.shotPer * shots.length) / 1000, () => {});
}

// ---------- ตัวที่เหมือนกัน ----------
// เกิดห่างเป้า 1 ช่องเว้นว่าง (ระยะ 2 · ไม่มี = 3, 4 …) ในชั้นของเป้า → ระเบียน | null
function spawnDouble(engine, owner, t, mode) {
  const d = engine.summon.spawn(owner, {
    kind: "double", hp: DOUBLE.hp, armor: DOUBLE.armor, mov: DOUBLE.mov, range: [1, 0], dim: t.dim || null,
    characterId: "valentine_double", name: t.name, img: engine.displayImg(t), color: engine.colorOf(t),
    look: t.id, targetId: t.id,
    data: { mode, dmg: mode === "parallel" ? PARALLEL.dmg : KNOW.dmg, pierce: mode !== "parallel" },
  });
  const at = freeNear(engine, d, t.pos, 2);
  if (!at) { engine.summon.remove(d); return null; }
  d.pos = { ...at };
  fx(engine, owner, "doubleSpawn", { id: d.id, ownerId: owner.id, doubleId: d.id, look: t.id, at: tile(at), targetId: t.id });
  return d;
}
// ตัวเหมือนจบบทบาท (ชน / ถูกทำลาย / เป้าตาย): กระดานคู่ขนาน = เป้ากลับกระดานหลัก · ตัวเหมือนตัวสุดท้ายของมิติ = มิติปิด ทุกคนกลับ
//  → วินาทีของฉากกลับกระดานหลัก (0 = ไม่มีใครย้าย)
function endDouble(engine, owner, d, t, delay = 0) {
  if (!d.summon || d.summon.mode !== "parallel") return 0;
  const dim = d.dim;
  const ids = [];
  if (t && t.alive && t.pos && t.dim === dim) { engine.dim.leave(t); ids.push(t.id); }
  const more = Object.values(engine.players).some((o) => o !== d && isDouble(o) && o.alive && o.summon.mode === "parallel" && o.dim === dim);
  if (!more) {
    for (const o of engine.dim.membersOf(dim)) { engine.dim.leave(o); ids.push(o.id); }
    if (owner && owner.valentine && owner.valentine.parallel === dim) owner.valentine.parallel = null;
  }
  if (!ids.length || !owner) return 0;
  fx(engine, owner, "dimOut", { ids, dim, ...(delay > 0 ? { delay } : null) });
  engine.log(`🇺🇸 กลับสู่กระดานหลัก — ${ids.map((id) => engine.players[id].name).join(", ")}`);
  return VAL_FX.dimOut / 1000;
}
// ถูกทำลาย / เป้าตาย / เจ้าของตาย: แตกเป็นลูกบาศก์ (ไม่ใช่การชน)
function breakDouble(engine, owner, d, at) {
  if (owner && at) fx(engine, owner, "doubleBreak", { id: d.id, ownerId: owner.id, doubleId: d.id, at: tile(at) });
  engine.sfx(SFX.menger);
}
// จบตาเดินของเป้า: วิ่งเข้าหาตามทางเดินจริง (ทางสั้นสุด · ไปไม่ถึง = เข้าใกล้สุด) · ถึงตัว (ระยะ 1) = ชน → วินาทีของฉาก
// ช่องของเป้า — ขี่ผู้เล่นอื่นอยู่ (server/ride.js: นอกตาของตัวเอง pos = null) = ช่องของตัวที่ถูกขี่
function bodyOf(engine, t) {
  if (t.pos) return Board.boxOf(t);
  const m = t.mountId && engine.players[t.mountId];
  return m && m.alive && m.pos ? Board.boxOf(m) : null;
}
function runDouble(engine, d, t, delay = 0) {
  const owner = ownerOf(engine, d);
  const tbox = t.alive ? bodyOf(engine, t) : null;
  if (!d.alive || !d.pos || !tbox || !engine.dim.same(d, t)) return 0; // คนละชั้น = รอ
  let secs = 0;
  if (Board.dist(Board.boxOf(d), tbox) !== 1) {
    const units = engine.boardUnits(d.id).filter((u) => u.id !== d.id);
    const reach = Board.reachable(engine.boardMap(), { id: d.id, x: d.pos.x, y: d.pos.y }, d.summon.mov, units, { blocked: engine.boardBlocked(d.id), hop: engine.hopTiles() });
    let best = null;
    for (const n of reach.values()) {
      const dd = Board.dist({ x: n.x, y: n.y, size: 1 }, tbox);
      if (dd < 1) continue;
      if (!best || dd < best.dd || (dd === best.dd && n.d < best.n.d)) best = { n, dd };
    }
    if (best && (best.n.x !== d.pos.x || best.n.y !== d.pos.y)) {
      const path = Board.pathTo(reach, best.n.x, best.n.y).map(tile);
      d.pos = { x: best.n.x, y: best.n.y };
      if (owner) fx(engine, owner, "doubleRun", { id: d.id, ownerId: owner.id, doubleId: d.id, path, targetId: t.id, ...(delay > 0 ? { delay } : null) });
      secs += (VAL_FX.doubleRunBase + VAL_FX.doubleRunStep * Math.max(1, path.length - 1)) / 1000;
    }
  }
  if (Board.dist(Board.boxOf(d), tbox) === 1) secs += collide(engine, owner, d, t, tbox, delay + Math.round(secs * 1000));
  return secs;
}
// ชน: กระดานคู่ขนาน 4 (เกราะก่อน) · รู้จักตัวเองฯ 2 ทะลุเกราะ · หลบไม่ได้ · ต้นตอ = ตัวเหมือน (ชั้นเดียวกับเป้า) → ตัวเหมือนสลาย
function collide(engine, owner, d, t, tbox, delay = 0) {
  const { dmg, pierce } = d.summon;
  const at = tile(d.pos), targetAt = tile(tbox || t.pos);
  const before = vit(t);
  if (owner) openWin(st(owner));
  d.summon.colliding = true; // เป้าตายจากการชนนี้ = ฉากเมนเจอร์ของตัวนี้เอง (onDeath ของเป้าไม่ต้องสั่งแตกซ้ำ)
  engine.withEffectSource(d, () => {
    t.wasAttacked = true;
    if (pierce) engine.dealDirect(t, dmg, false);
    else engine.dealMixed(t, dmg, false);
    if (t.alive && t.hp <= 0) engine.instantDeath(t);
  });
  const dealt = Math.max(0, before - vit(t));
  if (owner) closeWin(engine, owner, d);
  engine.log(`🧊 ตัวที่เหมือนกันชน ${t.name} -${dealt}${pierce ? " (ทะลุเกราะ)" : " (ลดเกราะก่อน)"}`);
  if (owner) fx(engine, owner, "menger", { id: d.id, ownerId: owner.id, doubleId: d.id, targetId: t.id, at, targetAt, dmg: dealt > 0 ? dmg : 0, pierce: !!pierce, ...(delay > 0 ? { delay } : null) });
  // เสียงตอนชนจริงบนจอ (หลังเดินถึง — ฉากล่าช้า delay ms)
  const ring = () => { engine.sfx(SFX.menger); speak(engine, owner, VOICE_EVENT.meet); };
  if (delay > 0) setTimeout(ring, delay).unref?.(); else ring();
  engine.summon.remove(d);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return VAL_FX.menger / 1000 + endDouble(engine, owner, d, t, delay + VAL_FX.menger);
}

// ---------- ท่าไม้ตาย ----------
function castParallel(engine, p, targets, dir) {
  const s = st(p);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => foe(engine, p, t) && !t.summon);
  const dim = `par:${p.id}:${++s.parSeq}`;
  const area = ULTS.parallel.area;
  const tiles = engine.areaTiles(p, area, dir).map(tile);
  for (const u of [p, ...foes]) engine.dim.enter(u, dim);
  s.parallel = dim;
  s.parallelSever = engine.severStamp();
  fx(engine, p, "parallelIn", { at: tile(p.pos), dir, tiles, ids: [p.id, ...foes.map((t) => t.id)], dim });
  engine.sfx(SFX.flag);
  engine.sfx(SFX.parallel);
  engine.log(`🇺🇸 ${p.name} จงปลาบปลื้ม — ${foes.map((t) => t.name).join(", ")} ถูกพาไปกระดานคู่ขนาน`);
  engine.skillBeat(VAL_FX.parallelIn / 1000, () => {});
  const made = foes.map((t) => spawnDouble(engine, p, t, "parallel")).filter(Boolean);
  if (made.length) {
    engine.sfx(SFX.double);
    engine.skillBeat(VAL_FX.doubleSpawn / 1000, () => {});
  } else {
    endDouble(engine, p, { summon: { mode: "parallel" }, dim }, null); // ไม่มีที่ให้ตัวเหมือนเกิด = มิติปิดทันที
  }
}
function castSelves(engine, p) {
  const spawns = [];
  st(p).selvesSever = engine.severStamp();
  for (let i = 0; i < SELVES.count; i++) {
    const c = engine.summon.spawn(p, {
      kind: "clone", controlled: true, hp: SELVES.hp, armor: SELVES.armor, mov: engine.baseMovOf(p), range: SELVES.range,
      dim: p.dim || null, characterId: ID, name: p.name, img: IMG.base, until: engine.roundNumber + SELVES.turns - 1,
      data: { sight: SELVES.sight }, // เห็นคนล่องหนในระยะนี้ (สายตาของฝ่ายวาเลนไทน์)
    });
    const at = freeNear(engine, c, p.pos, 1);
    if (!at) { engine.summon.remove(c); break; }
    c.pos = { ...at };
    spawns.push({ id: c.id, at: tile(at) });
  }
  fx(engine, p, "clones", { at: tile(p.pos), spawns });
  engine.sfx(SFX.flag);
  engine.sfx(SFX.clones);
  engine.log(`🇺🇸 ${p.name} แด่ตัวฉันทุกคน — วาเลนไทน์อีก ${spawns.length} คนก้าวออกมาจากหลังธง`);
  engine.skillBeat(VAL_FX.clones / 1000, () => {});
}
function castKnow(engine, p, t) {
  const d = spawnDouble(engine, p, t, "know");
  if (d) d.summon.sever = engine.severStamp();
  engine.sfx(SFX.flag);
  engine.sfx(SFX.double);
  engine.log(d ? `🇺🇸 ${p.name} รู้จักตัวเองอย่างแท้จริง — ตัวที่เหมือน ${t.name} ปรากฏขึ้น` : `🇺🇸 ${p.name} รู้จักตัวเองอย่างแท้จริง — ไม่มีที่ให้ตัวเหมือนปรากฏ`);
  engine.skillBeat(VAL_FX.doubleSpawn / 1000, () => {});
}
function castJustice(engine, p) {
  const hp = roll(JUSTICE.hp), armor = roll(JUSTICE.armor), sp = roll(JUSTICE.sp);
  const card = (p.statusAmt && p.statusAmt.cardAtkBonus) || 0;
  p.statuses = {};
  p.statusAmt = { cardAtkBonus: card };
  p.shield = 0; p.tempHp = 0; p.tempHpTurns = 0;
  p.hp = Math.min(engine.maxHpOf(p), hp);
  p.armor = Math.min(engine.maxArmorOf(p), armor);
  p.skillPoints = Math.min(engine.maxSkillOf(p), sp);
  fx(engine, p, "justice", { at: tile(p.pos), hp: p.hp, armor: p.armor, sp: p.skillPoints });
  engine.sfx(SFX.flag);
  engine.sfx(SFX.justice);
  engine.log(`🇺🇸 ${p.name} ความยุติธรรมไม่มีวันตาย — พลังชีวิต ${p.hp} · เกราะ ${p.armor} · แต้มสกิล ${p.skillPoints} · ล้างสถานะทั้งหมด`);
  engine.skillBeat(VAL_FX.justice / 1000, () => {});
}
// ตัวเลือกท่าไม้ตายนี้กดได้ไหม (ไม่ดูเป้า/แต้ม)
function ultBlocked(engine, p, key) {
  const s = st(p);
  if (!ULTS[key] || cdLeft(s.ultReady[key], engine.roundNumber) > 0) return true;
  if (inVeil(p) && key !== "justice") return true; // ในมิติหลบสายตา: ความยุติธรรมไม่มีวันตายเท่านั้น
  if (key === "parallel" && (s.parallel || p.dim)) return true; // เปิดได้ทีละมิติ
  return false;
}
const shotsOf = (form) => (SHOTS[form] ? SHOTS[form].n : 0);

// ---------- ร่างแยก / ตัวที่เหมือนกัน หายไป ----------
function fadeClones(engine, owner, list) {
  if (!list.length) return;
  for (const c of list) engine.summon.remove(c);
  fx(engine, owner, "cloneFade", { ids: list.map((c) => c.id) });
}

module.exports = {
  id: ID,
  IMG, SFX, VOICE, VOICE_ULT, VOICE_EVENT, VAL_FX, HP, ARMOR, MOV, RANGE, VEIL, GUN, ULT_CD, DOUBLE, PARALLEL, SELVES, KNOW, JUSTICE, KNOW_CELLS, SHOTS, ULTS,
  isVal,

  resetCombat(p) { p.valentine = isVal(p) ? fresh() : null; },
  // เสียงพากย์ตามเหตุการณ์ (server/voice.js) — basic ดังเฉพาะตอนเข้ามิติ (เรียกหลังลงผล: ยังอยู่ในมิติ = เพิ่งเข้า)
  voiceLines(p) { return isVal(p) ? { ...VOICE, basic: inVeil(p) ? VOICE.veil : [] } : null; },
  // ในมิติหลบสายตา: ตีปกติไม่ได้ (ไม่มีใครอยู่ชั้นเดียวกันอยู่แล้ว — กันไว้ให้ client ไม่วาดช่องตี)
  range(p) { return inVeil(p) ? [1, 0] : null; },
  stealthed(p) { return inVeil(p); },
  untouchable(engine, p) { return inVeil(p); },
  // ตีปกติ: ประชิด = มีด · ห่าง 2 = ปืน (ร่างแยกใช้ชุดเดียวกัน) — เสียงอ่านท่าที่เพิ่งเลือก (strikeCard เรียก style ก่อน sound)
  attackStyle(p, dist) {
    if (!isValUnit(p)) return null;
    const style = dist <= 1 ? "valKnife" : "valGun";
    LAST_STYLE.set(p, style);
    return style;
  },
  attackSound(p) { return isValUnit(p) ? (LAST_STYLE.get(p) === "valGun" ? SFX.gun : SFX.knife) : undefined; },
  // ร่างแยก: ตีปกติดาเมจตายตัว 1
  fixedStrikeDamage(engine, a) { return isValUnit(a) && a.summon ? SELVES.dmg : null; },

  // ---------- สกิล ----------
  skillCost(p, tier, base, opts) {
    if (!isVal(p)) return base;
    if (tier === "basic") return inVeil(p) ? 0 : VEIL.cost;
    if (tier === "secondary") return 0;
    if (tier === "ultimate") { const u = ULTS[opts && opts.form]; return u ? u.cost : base; }
    return base;
  },
  skillArea(p, tier, area, opts) {
    if (!isVal(p)) return area;
    if (tier === "secondary") return GUN_AREA;
    if (tier === "ultimate") { const u = ULTS[opts && opts.form]; return u ? u.area : area; }
    return area;
  },
  skillPub(p, tier) {
    if (!isVal(p)) return null;
    const s = st(p);
    if (tier === "basic") return inVeil(p) ? { cost: 0, active: true } : null;
    if (tier === "secondary") {
      const reloading = s.ammo <= 0;
      return {
        choices: SHOT_KEYS.map((k) => ({
          key: k, name: SHOTS[k].name, img: IMG.skill2, cost: 0, area: GUN_AREA, desc: SHOTS[k].desc,
          locked: reloading || s.ammo < SHOTS[k].n || inVeil(p),
        })),
      };
    }
    if (tier === "ultimate") {
      return { // ห่วงเวลาซีโร่: client เทาทั้งปุ่มจาก skillLocks.ultimate อยู่แล้ว
        choices: ULT_KEYS.map((k) => {
          const left = cdLeft(s.ultReady[k], engineRef.roundNumber);
          return { key: k, name: ULTS[k].name, img: IMG.skill3, cost: ULTS[k].cost, area: ULTS[k].area, desc: ULTS[k].desc, locked: ultBlocked(engineRef, p, k), left, cd: left };
        }),
      };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isVal(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    if (tier === "basic") {
      if (inVeil(p)) return true; // กด = ออก
      return !p.dim && cdLeft(s.veilReady, engine.roundNumber) === 0; // ระหว่างอยู่ในกระดานคู่ขนานกดไม่ได้
    }
    if (tier === "secondary") {
      const n = shotsOf(opts.form);
      return !inVeil(p) && n > 0 && s.ammo >= n;
    }
    if (tier === "ultimate") {
      const key = opts.form;
      if (ultBlocked(engine, p, key)) return false;
      if (key === "parallel") return (targets || []).some((id) => { const t = engine.players[id]; return foe(engine, p, t) && !t.summon; });
      if (key === "know") {
        const t = engine.players[(targets || [])[0]];
        return foe(engine, p, t) && !t.summon && doublesOn(engine, t.id).length === 0;
      }
      return true;
    }
    return false;
  },
  // ปุ่มออกจากมิติ: 0 แต้ม ไม่กินโควตา (ยังล็อกการเดินตามปกติ)
  // ปืน: กดได้หลายครั้งในตาเดียว (เท่าที่มีกระสุน) ไม่นับโควตาสกิล — กดแล้วเดินต่อไม่ได้ (ผู้ใช้สั่ง 2026-10-21) · ปุ่มออกจากมิติ = สวิตช์
  skipsTurnQuota(p, tier) { return tier === "secondary" || (tier === "basic" && inVeil(p)); },
  ignoresTurnQuota(p, tier) { return tier === "secondary" || (tier === "basic" && inVeil(p)); },
  // กดหลบสายตาก่อนเดิน = เดินในมิติต่อในตานั้นได้
  keepsMove(engine, p, tier) { return tier === "basic" && isVal(p) && !inVeil(p) && !!engine.action && !engine.action.moved; },
  endsTurn(engine, p, tier, opts = {}) { return isVal(p) && tier === "ultimate" && opts.form === "selves"; },
  // ปืน: ลงผลพื้นที่เอง (hitArea ตามแนวที่ยิง) · กระดานคู่ขนาน: ไม่มีผลพื้นที่โจมตี (ไม่ทุบหนาม/ผนึก)
  ownsAreaHit(p, tier, opts = {}) { return isVal(p) && (tier === "secondary" || (tier === "ultimate" && opts.form === "parallel")); },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isVal(p)) return "";
    const s = st(p);
    if (tier === "basic") {
      if (s.veil) {
        const secs = exitVeil(engine, p);
        if (secs > 0) engine.skillBeat(secs, () => {});
      } else enterVeil(engine, p);
      return "";
    }
    if (tier === "secondary") { shoot(engine, p, shotsOf(opts.form), opts.dir); return ""; }
    if (tier === "ultimate") {
      const key = opts.form;
      s.ultReady[key] = engine.roundNumber + ULT_CD;
      speak(engine, p, VOICE_ULT[key]);
      if (key === "parallel") castParallel(engine, p, targets, opts.dir);
      else if (key === "selves") castSelves(engine, p);
      else if (key === "know") castKnow(engine, p, engine.players[targets[0]]);
      else if (key === "justice") castJustice(engine, p);
      return ULTS[key] ? ` — ${ULTS[key].name}` : "";
    }
    return "";
  },
  skillLocks(engine, p) {
    if (!isValUnit(p)) return undefined;
    if (p.summon) return { basic: { cd: 0, locked: true }, secondary: { cd: 0, locked: true }, ultimate: { cd: 0, locked: true } }; // ร่างแยก: ไม่มีสกิล
    const s = st(p), r = engine.roundNumber;
    const veilCd = cdLeft(s.veilReady, r);
    return {
      basic: inVeil(p) ? { cd: 0, locked: false, free: true } : { cd: veilCd, locked: veilCd > 0 || !!p.dim },
      secondary: { cd: s.ammo > 0 ? 0 : cdLeft(s.reloadRound, r), locked: s.ammo <= 0 || inVeil(p) },
      ultimate: { cd: 0, locked: ULT_KEYS.every((k) => ultBlocked(engine, p, k)) },
    };
  },

  // ---------- จังหวะเทิร์น ----------
  // ต้นเทิร์น: รีโหลดครบ = กระสุนเต็ม
  onRoundStartTick(engine, p) {
    if (!isVal(p) || !p.valentine) return;
    const s = p.valentine;
    if (s.ammo <= 0 && engine.roundNumber >= s.reloadRound) {
      s.ammo = GUN.ammo;
      if (p.pos) fx(engine, p, "reload", { at: tile(p.pos) });
      engine.sfx(SFX.reload);
      engine.log(`🔫 ${p.name} รีโหลดปืนแห่งสันติภาพเต็ม ${GUN.ammo} นัด`);
    }
  },
  // จบเทิร์น: อยู่ในมิติ = แต้มสกิล +1 · ครบ 3 เทิร์น = โผล่ · ร่างแยกหมดเวลา
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isVal(p) || !p.valentine) continue;
      const s = p.valentine;
      if (s.veil && p.alive) {
        engine.addSkill(p, VEIL.sp, "passive");
        if (engine.roundNumber >= s.veil.until) exitVeil(engine, p);
      }
      const due = engine.summon.ofOwner(p.id, "clone").filter((c) => c.summon.until != null && engine.roundNumber >= c.summon.until);
      fadeClones(engine, p, due);
      if (due.length) speak(engine, p, VOICE_EVENT.clonesOut);
    }
  },
  // ตาเดินของใครก็ได้จบ (server/phases/action.js finishActor): ตัวที่เหมือนเป้าคนนี้วิ่งเข้าหา + ชน → วินาทีพักฉาก
  afterActorEnd(engine, p) {
    if (!p || p.summon) return 0;
    let secs = 0;
    for (const d of doublesOn(engine, p.id)) secs += runDouble(engine, d, p, Math.round(secs * 1000)); // หลายตัว = ทีละตัว (ฉากต่อกัน)
    return secs;
  },
  // สกิลติดตัว: ทำให้เป้าเสียหายจริง (ฮุค broadcast จาก combat.tookDamage) → +1 ครั้งเดียวต่อการโจมตี (คำสั่ง / ช่วงที่โมดูลเปิด)
  onDamageDealt(engine, src, victim) {
    const owner = ownerOf(engine, src);
    if (!owner || !owner.alive || !victim || victim.id === owner.id) return;
    const s = st(owner);
    if (s.win) { s.win.hit = true; return; }
    const key = engine.cmdSeq;
    if (s.gainKey === key) return;
    s.gainKey = key;
    grant(engine, owner, src);
  },
  // ตัวที่เหมือนกัน/ร่างแยกถูกฆ่า (server/summon.js)
  onSummonDeath(engine, owner, u) {
    if (!isVal(owner) || !isDouble(u)) return;
    breakDouble(engine, owner, u, u.pos);
    engine.log(`🧊 ตัวที่เหมือน ${u.name} ถูกทำลาย`);
    endDouble(engine, owner, u, engine.players[u.summon.targetId]);
  },
  onDeath(engine, x) {
    if (isVal(x)) {
      // ตัวจริงตาย: ร่างแยกหายหมด · ตัวเหมือนแตก · กระดานคู่ขนานปิด · มิติหลบสายตาหาย
      fadeClones(engine, x, engine.summon.ofOwner(x.id, "clone"));
      const dims = new Set();
      for (const d of engine.summon.ofOwner(x.id, "double")) {
        breakDouble(engine, x, d, d.pos);
        if (d.summon.mode === "parallel" && d.dim) dims.add(d.dim);
        engine.summon.remove(d);
      }
      const s = st(x);
      if (s.parallel) dims.add(s.parallel);
      const ids = [];
      for (const dim of dims) for (const o of engine.dim.membersOf(dim)) { engine.dim.leave(o); ids.push(o.id); }
      if (ids.length) fx(engine, x, "dimOut", { ids, dim: s.parallel });
      s.parallel = null;
      s.veil = null;
      x.dim = null; x.dimGhost = false;
      return;
    }
    if (!x || x.summon) return;
    // เป้าตาย = ตัวเหมือนหาย
    for (const d of doublesOn(engine, x.id)) {
      if (d.summon.colliding) continue; // ตัวที่กำลังชนจัดการเอง (collide)
      const owner = ownerOf(engine, d);
      breakDouble(engine, owner, d, d.pos);
      engine.summon.remove(d);
      endDouble(engine, owner, d, x);
    }
    x.dim = null; x.dimGhost = false;
  },
  // เปลี่ยนแผนที่: ทุกคนกลับกระดานหลัก (ระบบกลาง) · ยูนิตที่ถูกเรียกหายหมด → ล้างสถานะของตัวเอง (หลบสายตาที่ค้าง = ออก นับคูลดาวน์)
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isVal(p) || !p.valentine) continue;
      if (p.valentine.veil) { p.valentine.veil = null; p.valentine.veilReady = engine.roundNumber + VEIL.cd; }
      p.valentine.parallel = null;
    }
  },
  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) — ตัวจริงเท่านั้น (ร่างแยก/ตัวเหมือนไม่มีผลสกิล) ----------
  //  หลบสายตา (โผล่ · คูลดาวน์ 3 นับจากเทิร์นนี้) · กระดานคู่ขนาน (ตัวเหมือนของมิติแตก · ทุกคนกลับกระดานหลัก ไม่มีใครโดนชน)
  //  ตัวเหมือนของรู้จักตัวเองฯ (แตก — ตัวละ 1 รายการ) · ร่างแยกของแด่ตัวฉันทุกคน (หายหมดแบบหมดเวลา)
  //  คูลดาวน์ท่าไม้ตายนับจากตอนกดอยู่แล้ว · ความยุติธรรมไม่มีวันตาย = ผลทันที ไม่มีอะไรค้าง
  severables(engine, p) {
    if (!isVal(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.veil) {
      out.push({
        key: "veil", label: "หลบสายตา", at: s.veil.sever || 0,
        cancel: () => { exitVeil(engine, p); },
      });
    }
    if (s.parallel) {
      const dim = s.parallel;
      out.push({
        key: "parallel", label: ULTS.parallel.name, at: s.parallelSever,
        cancel: () => {
          for (const d of engine.summon.ofOwner(p.id, "double")) {
            if (d.summon.mode !== "parallel" || d.dim !== dim) continue;
            breakDouble(engine, p, d, d.pos);
            engine.summon.remove(d);
          }
          const ids = [];
          for (const o of engine.dim.membersOf(dim)) { engine.dim.leave(o); ids.push(o.id); }
          s.parallel = null;
          if (ids.length) fx(engine, p, "dimOut", { ids, dim });
          engine.log(`🇺🇸 ${ULTS.parallel.name}ของ ${p.name} ถูกตัด — กลับสู่กระดานหลัก`);
        },
      });
    }
    for (const d of engine.summon.ofOwner(p.id, "double")) {
      if (d.summon.mode !== "know") continue;
      out.push({
        key: `know:${d.id}`, label: ULTS.know.name, at: d.summon.sever || 0,
        cancel: () => {
          breakDouble(engine, p, d, d.pos);
          engine.summon.remove(d);
          engine.log(`🧊 ตัวที่เหมือน ${d.name} สลายไป`);
        },
      });
    }
    const clones = engine.summon.ofOwner(p.id, "clone");
    if (clones.length) {
      out.push({
        key: "selves", label: ULTS.selves.name, at: s.selvesSever,
        cancel: () => {
          fadeClones(engine, p, engine.summon.ofOwner(p.id, "clone"));
          speak(engine, p, VOICE_EVENT.clonesOut);
          engine.log(`🇺🇸 ร่างแยกของ ${p.name} หายไป`);
        },
      });
    }
    return out;
  },

  // ธงชาติที่ปักไว้ (ทุกคนเห็น · ไม่ขวาง) → state.board.valentine
  boardPublic(engine) {
    const vals = Object.values(engine.players).filter(isVal);
    if (!vals.length) return {};
    return {
      valentine: {
        flags: vals.filter((p) => p.alive && p.valentine && p.valentine.veil).map((p) => ({ ...p.valentine.veil.flag, ownerId: p.id })),
      },
    };
  },

  // ---------- ข้อมูลให้ client (GRID_PLAN §7.13 สัญญาข้อมูล) ----------
  valentineState(engine, p) {
    if (!isVal(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      ammo: s.ammo, ammoMax: GUN.ammo, reloadCd: s.ammo > 0 ? 0 : cdLeft(s.reloadRound, r),
      veil: s.veil ? { left: Math.max(1, s.veil.until - r + 1) } : null,
      veilCd: s.veil ? 0 : cdLeft(s.veilReady, r),
      ultCd: Object.fromEntries(ULT_KEYS.map((k) => [k, cdLeft(s.ultReady[k], r)])),
      parallel: s.parallel || null,
    };
  },
};

// ท่าตีล่าสุดของแต่ละหน่วย (attackStyle → attackSound)
const LAST_STYLE = new WeakMap();
// skillPub ไม่ได้รับ engine — อ่านเลขเทิร์นผ่าน engine ของ server (require ตอนเรียก กัน require วน)
const engineRef = {
  get roundNumber() { return require("../server/engine").engine.roundNumber; },
  get action() { return require("../server/engine").engine.action; },
};

// ============================================================
//  ดิเอโก้ แบรนโด (โลกคู่ขนาน — JoJo Part 7 · สแตนด์ THE WORLD) — ระดับยาก · id "diego_alt" · เลือกซ้ำได้หลายคน
//  กติกาทั้งหมดผู้ใช้ตัดสิน 2026-10-20 — GRID_PLAN.md §7.12 (แหล่งความจริง + สัญญาข้อมูล server ↔ client)
//
//  พลังชีวิต 6 · เกราะ 2 · เดิน 4 (ขี่ม้า 5) · ตีปกติ [1, 2] · เริ่มเกมขี่ม้า
//  คลังเครื่องมือ (พื้นฐาน · ปุ่มหลายตัวเลือก): โควตาของตัวเอง 2 ครั้งต่อเทิร์น (ไม่กินโควตาสกิล · ไม่ล็อกการเดิน · หยุดเวลา = ไม่จำกัด)
//    ถังน้ำมัน (2 · 3×3 ระยะ 4): แอ่งน้ำมันถาวรจนเปลี่ยนแผนที่ · ศัตรูในพื้นที่ตอนโยน = ชุ่มน้ำมัน 3 เทิร์น · เริ่มตาเดินบนน้ำมัน = เดิน −1
//      โยนทับ/ติดกองไฟ = ติดไฟระเบิดทั้งแอ่งทันที (กองไฟใหม่นับเวลาใหม่)
//    ไม้ขีดไฟ (1 · 1×1 ระยะ 4): คน = ลุกไหม้ 1 (ติดตาข่าย = 3) · แอ่งน้ำมัน = ระเบิดทั้งแอ่ง · คนชุ่มน้ำมัน = ระเบิด 3×3 รอบตัว (ชุ่มน้ำมันหาย)
//      ระเบิด: ทุกคนในชุดช่อง −2 (เกราะก่อน) + ลุกไหม้ 1 (ติดตาข่าย = 3) → กองไฟ 3 เทิร์น (ต้นเทิร์นยืนอยู่ = ลุกไหม้ 1) → ขี้เถ้า
//      ดิเอโก้ (+เพื่อนร่วมทีม) ไม่โดนไฟ/ระเบิด/แอ่งน้ำมันของตัวเอง
//    ตาข่ายดัก (2 · 3×3 ระยะ 4): ล่องหน เจ้าของเห็นคนเดียว · ศัตรูเข้าพื้นที่ (เดิน/ถูกผลัก/ไถล) = หยุด ถูกดึงไปช่องกลาง + ตรึง 1 เทิร์น → ตาข่ายหาย
//      วางพร้อมกันได้ 3 อัน (เปลี่ยนแผนที่ = ล้าง)
//    มีด (2 · หยุดเวลา 1 · แนว 4×1): ศัตรูคนแรก −1 · เครื่องปฐมพยาบาล (0 · 2 ครั้งต่อเกม): ฟื้นพลังชีวิต 2 + เกราะ 1
//  ปืนลูกโม่ (รอง 0 · ไม่กินโควตา · ล็อกการเดิน · ไม่จบตา): แนว 5×1 ศัตรูคนแรก −1 · ตาละ 1 นัด · 4 นัด · หมด = รีโหลด 5 เทิร์น
//  เดอะเวิลด์ (ท่าไม้ตาย · เล่ห์เหลี่ยม 5 · คูลดาวน์ 3): ตั้งรับจนจบเทิร์น — ศัตรูทำให้เสียหาย = ยกเลิกการกระทำทั้งก้อน + ผู้โจมตีจบตา
//    + ตาหยุดเวลาทันที (server/timeStop.js) · ไม่โดนตี = ตาหยุดเวลาต้นเทิร์นถัดไปก่อนทุกคน (แม้ไพ่แตก · ตาปกติยังอยู่)
//    ตาหยุดเวลา = ตาใหม่เต็มๆ + คลังเครื่องมือไม่จำกัด + มีด 1 แต้ม + ปืนอีก 1 นัด · ดาเมจ/สถานะที่ทำใส่คนอื่นลงตอนเวลาเดินต่อ
//  เป็นไปดั่งกลอุบาย (ท่าไม้ตายในตาหยุดเวลาเท่านั้น · 4 แต้ม + กระสุน 2 · ต้องขี่ม้า): พุ่ง 4×1 · ชนศัตรูคนแรก −4 + กระเด็น 2 ช่อง + เลือดไหล 2
//    · ใช้แล้วเวลาเดินต่อ + จบตา · คลิป intro ทุกครั้ง · ชน = คลิป final
//  อัจฉริยะ จอมวางแผน (ติดตัว): เล่ห์เหลี่ยม สูงสุด 10 · +1 ต่อการใช้คลังเครื่องมือ · +1 ต่อเหตุการณ์ (ชุ่มน้ำมัน/ระเบิด/ตาข่ายดักติด/กองไฟเผาศัตรู)
//  ม้าคู่ใจ ซิลเวอร์ บูลเล็ต (ติดตัว · characters/_horse.js): เลือด 3 รับก่อนเกราะ · เดิน +1 · ตาย = เรียกไม่ได้ 3 เทิร์น
//
//  ทุกอย่างเก็บที่ p.diego (หลายคนไม่ปนกัน) · แอ่งน้ำมัน/กองไฟ/ขี้เถ้า = ชั้นพื้นกลาง match.board.diego (มีเจ้าของ)
//  เอฟเฟกต์: engine.boardFx("diegoFx", { kind, id, color, … }) — client/src/board/diegoFx.js (session diego-fx)
// ============================================================
const Board = require("../server/board");
const Horse = require("./_horse");

const ID = "diego_alt";
const DIR = "/characters/diego_alt";
const IMG = {
  base: `${DIR}/diego.png`,
  horse: `${DIR}/sliver_bullet.png`,
  skill1: `${DIR}/diego_skill1.jpg`,
  skill2: `${DIR}/diego_skill2.jpg`,
  skill3: `${DIR}/diego_skill3.webp`,
  plot: `${DIR}/diego_skill3.2.jpg`,
  oil: `${DIR}/oil.jpg`,
  match: `${DIR}/match.jpg`,
  net: `${DIR}/net.jpg`,
  knife: `${DIR}/knife.jpg`,
  aid: `${DIR}/first_aid.jpg`,
};
const VIDEO = { intro: `${DIR}/diego_skill3.2_intro.mp4`, final: `${DIR}/diego_skill3.2_final.mp4` };
const CUT = { intro: "diegoPlotIntro", final: "diegoPlotFinal" };
// เสียงเอฟเฟกต์ (client/src/audio.js — sfx/*.mp3 · GRID_PLAN §7.12)
const SFX = {
  throw: "diego_throw", splash: "diego_splash", match: "diego_match", explode: "diego_explode", fire: "diego_fire",
  net: "diego_net", netTrap: "diego_net_trap", knife: "diego_knife", shot: "diego_shot", reload: "diego_reload",
  heal: "diego_heal", world: "diego_world", stop: "diego_stop", tick: "diego_tick", resume: "diego_resume", gallop: "diego_gallop", crash: "diego_crash",
  empty: "diego_empty",
};
// เสียงพากย์ตามเหตุการณ์ (server/voice.js) — สุ่ม 1 คีย์ต่อครั้ง · ช่วงหยุดเวลาท่าไม้ตายมีคลิปพูดเอง
const VOICE = {
  turn: ["diego_v_start1", "diego_v_start2"],
  strike: ["diego_v_hit1"],
  struck: ["diego_v_hitby1", "diego_v_hitby2", "diego_v_hitby3"],
  basic: ["diego_v_skill1_1", "diego_v_skill1_2", "diego_v_skill1_3"],
  secondary: [],
  ultimate: [], // กดเดอะเวิลด์ = ได้ยินเฉพาะฝ่ายตัวเอง (VOICE_WORLD — ส่งเองใน applyInstantSkill)
};
const VOICE_WORLD = "diego_v_skill3";
const VOICE_TRIGGER = { counter: "diego_v_skill3_counter", normal: "diego_v_skill3_normal" };

const HP = 6;
const ARMOR = 2;
const MOV = 4;
const MOV_HORSE = 5;
const RANGE = [1, 2];
const TOOL_PER_TURN = 2;
const THROW_RANGE = 4;
const OIL_SOAK_TURNS = 3;
const OIL_SLOW = 1;
const EXPLODE_DMG = 2;
const BURN = 1;
const NET_BURN = 3;
const FIRE_TURNS = 3;
const NET_MAX = 3;
const NET_ROOT = 1;
const KNIFE = { len: 4, dmg: 1, cost: 2, stopCost: 1 };
const AID = { uses: 2, hp: 2, armor: 1 };
const GUN = { ammo: 4, reload: 5, dmg: 1, len: 5 };
const WORLD = { cunning: 5, cd: 3 };
const PLOT = { cost: 4, ammo: 1, len: 4, dmg: 4, push: 2, bleed: 2 }; // กระสุน 1 นัด (ผู้ใช้สั่ง 2026-10-20 — เดิม 2)
const STOP_SKILLS = 5; // ตาหยุดเวลา: กดสกิลรวมกันได้ 5 ครั้ง (ทุกช่อง) แทนตีปกติ/โควตาเดิม (ผู้ใช้สั่ง 2026-10-20)
const CUNNING_MAX = 10;
const HORSE = { hp: 3, cd: 3, name: "ซิลเวอร์ บูลเล็ต" };
// จังหวะเอฟเฟกต์ (ms) — ต้องตรงกับ DIEGO_FX ใน client/src/board/diegoFx.js (GRID_PLAN §7.12)
const DIEGO_FX = {
  throw: 650, oil: 450, explode: 900, ignite: 450, netTrap: 700, knife: 450, shot: 380, firstAid: 600,
  world: 1300, timeStop: 2200, timeResume: 1500, plotBase: 600, plotPerTile: 90,
};

const TOOLS = {
  oil: { name: "ถังน้ำมัน", img: IMG.oil, cost: 2, area: { kind: "tile", range: THROW_RANGE, square: 3, place: "any", hostile: true },
    desc: `โยนลงพื้นที่ 3×3 ระยะ ${THROW_RANGE}: แอ่งน้ำมันอยู่จนเปลี่ยนแผนที่ · ศัตรูในพื้นที่ตอนโยน = ชุ่มน้ำมัน ${OIL_SOAK_TURNS} เทิร์น · เริ่มตาเดินบนน้ำมัน = เดิน −${OIL_SLOW} · โยนติดกองไฟ = ระเบิดทันที` },
  match: { name: "ไม้ขีดไฟ", img: IMG.match, cost: 1, area: { kind: "tile", range: THROW_RANGE, place: "any", hostile: true },
    desc: `โยน 1 ช่อง ระยะ ${THROW_RANGE}: คน = ลุกไหม้ ${BURN} (ติดตาข่าย = ${NET_BURN}) · แอ่งน้ำมัน/คนชุ่มน้ำมัน = ระเบิด −${EXPLODE_DMG} + ลุกไหม้ แล้วเป็นกองไฟ ${FIRE_TURNS} เทิร์น` },
  net: { name: "ตาข่ายดัก", img: IMG.net, cost: 2, area: { kind: "tile", range: THROW_RANGE, square: 3, place: "any" },
    desc: `วางพื้นที่ 3×3 ระยะ ${THROW_RANGE} (ล่องหน เห็นคนเดียว · วางพร้อมกันได้ ${NET_MAX}): ศัตรูเข้าพื้นที่ = ถูกดึงไปช่องกลาง + ถูกตรึง ${NET_ROOT} เทิร์น แล้วตาข่ายหาย` },
  knife: { name: "มีด", img: IMG.knife, cost: KNIFE.cost, area: { kind: "line", len: KNIFE.len, width: 1, hostile: true },
    desc: `เลือกทิศ แนว ${KNIFE.len}×1: ศัตรูคนแรก ความเสียหาย ${KNIFE.dmg}` },
  aid: { name: "เครื่องปฐมพยาบาล", img: IMG.aid, cost: 0, area: { kind: "self" },
    desc: `ฟื้นพลังชีวิต ${AID.hp} + เกราะ ${AID.armor} (${AID.uses} ครั้งต่อเกม)` },
};
const TOOL_KEYS = Object.keys(TOOLS);
const PLOT_SKILL = {
  name: "เป็นไปดั่งกลอุบาย", img: IMG.plot, cost: PLOT.cost, area: { kind: "line", len: PLOT.len, width: 1, hostile: true },
  desc: `ขี่ม้า · กระสุน ${PLOT.ammo} นัด · เลือกทิศ พุ่ง ${PLOT.len} ช่อง: ชนศัตรูคนแรก ความเสียหาย ${PLOT.dmg} + กระเด็น ${PLOT.push} ช่อง + เลือดไหล ${PLOT.bleed} · เวลาเดินต่อแล้วจบตาเดิน`,
};

const K = Board.key;
const isDiego = (p) => !!p && p.characterId === ID;
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const tile = (t) => ({ x: t.x, y: t.y });

// เครื่องมือ dev: ECHO_DEV_DIEGO_CUNNING=10 เริ่มเกมพร้อมเล่ห์เหลี่ยม (ทดสอบเดอะเวิลด์ในเกมจริง) · ไม่ตั้ง = 0
const devCunning = () => Math.max(0, Math.min(10, Math.floor(Number(process.env.ECHO_DEV_DIEGO_CUNNING)) || 0));
function fresh() {
  return {
    cunning: devCunning(),
    ammo: GUN.ammo,
    reloadRound: 0,       // กระสุนหมด: เต็มอีกครั้งเมื่อ roundNumber >= ค่านี้
    aid: AID.uses,
    toolRound: 0, toolUsed: 0, // คลังเครื่องมือ: ใช้ไปกี่ครั้งในเทิร์น toolRound (ตาหยุดเวลาไม่นับ)
    shotRound: 0,         // ยิงปืนแล้วในเทิร์นนี้ (ตาปกติ)
    armedRound: 0,        // กดเดอะเวิลด์เทิร์นนี้ (ตั้งรับจนจบเทิร์น)
    pendingNormal: false, // ไม่โดนตี → ตาหยุดเวลาต้นเทิร์นหน้า
    worldReady: 0,        // คูลดาวน์เดอะเวิลด์ (กดได้อีกเมื่อ roundNumber >= ค่านี้)
    stopping: false, stopKind: null, stopUses: 0, savedQuota: false,
    nets: [], netSeq: 0,  // ตาข่ายบนกระดาน [{ x, y, seq }] (ช่องกลาง)
    ...Horse.fresh(HORSE),
  };
}
function st(p) { return p.diego || (p.diego = fresh()); }
function fx(engine, p, kind, data) {
  engine.boardFx("diegoFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}
const horseCfg = { ...HORSE, fx: (engine, p, mode) => fx(engine, p, "horse", { at: { ...p.pos }, mode }) };
// ศัตรูของดิเอโก้ (ไม่ใช่ตัวเอง/เพื่อนร่วมทีม)
const foe = (engine, p, t) => !!t && t.alive && t.id !== p.id && !engine.sameTeam(p, t);
const stopping = (p) => isDiego(p) && !!st(p).stopping;
// ฝ่ายเดียวกับดิเอโก้ (ตัวเอง + เพื่อนร่วมทีม) — กดเดอะเวิลด์แล้วศัตรูต้องไม่รู้ (ผู้ใช้สั่ง 2026-10-20)
const sideIds = (engine, p) => Object.values(engine.players).filter((o) => o.id === p.id || engine.sameTeam(p, o)).map((o) => o.id);
const allyView = (engine, p, viewer) => !!viewer && (viewer.id === p.id || engine.sameTeam(p, viewer));
function addCunning(engine, p, n) {
  const s = st(p);
  const before = s.cunning;
  s.cunning = Math.min(CUNNING_MAX, s.cunning + n);
  if (s.cunning > before && p.pos) fx(engine, p, "cunning", { at: { ...p.pos }, gain: s.cunning - before });
}
// ดาเมจเครื่องมือ 1 ครั้ง (เกราะก่อน · ฆ่าได้ · ไม่หลบ) → ที่ลงจริง · ผู้เรียกอยู่ในนามดิเอโก้ (effectSource)
function hurt(engine, p, t, n, label) {
  if (!foe(engine, p, t)) return 0;
  const before = (t.hp || 0) + (t.armor || 0);
  t.wasAttacked = true;
  engine.dealMixed(t, n, false);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  engine.log(`🗡️ ${label} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return dealt;
}
// สถานะที่อยู่ "N เทิร์น" นับจากตอนนี้ (เป้าที่เดินไปแล้ว/กำลังเดิน = +1 ให้มีผลเต็มเทิร์นถัดไป — แบบตรึงของไจโร)
const turnsFor = (engine, t, n) => n + ((engine.hasActed(t.id) || engine.actorId === t.id) ? 1 : 0);

// ---------- ชั้นพื้น: น้ำมัน / กองไฟ / ขี้เถ้า (match.board.diego) ----------
function layers(engine) {
  const b = engine.board;
  if (!b) return null;
  return b.diego || (b.diego = { oil: {}, fire: {}, ash: {} });
}
const oilAt = (engine, x, y) => { const L = engine.board && engine.board.diego; return (L && L.oil[K(x, y)]) || null; };
const fireAt = (engine, x, y) => { const L = engine.board && engine.board.diego; return (L && L.fire[K(x, y)]) || null; };
// ช่องเปิด (ในกระดาน · ไม่ใช่สิ่งกีดขวาง · ไม่ใช่ร้านค้า) ที่วางของบนพื้นได้
function openTile(engine, x, y) {
  const map = engine.boardMap();
  if (!Board.inBounds(map, x, y) || map.terrain[K(x, y)]) return false;
  const shop = engine.shopPos;
  return !(shop && shop.x === x && shop.y === y);
}
const square3 = (engine, c) => engine.tileArea({ kind: "tile", square: 3 }, c).filter((t) => openTile(engine, t.x, t.y));
const near4 = (t) => [{ x: t.x + 1, y: t.y }, { x: t.x - 1, y: t.y }, { x: t.x, y: t.y + 1 }, { x: t.x, y: t.y - 1 }];
// แอ่งน้ำมันทั้งแอ่งที่ต่อกับช่อง seeds (ติดกัน 4 ทิศ)
function oilPool(engine, seeds) {
  const L = layers(engine);
  const seen = new Set(), out = [], q = seeds.filter((t) => L.oil[K(t.x, t.y)]).map(tile);
  while (q.length) {
    const t = q.shift(), k = K(t.x, t.y);
    if (seen.has(k) || !L.oil[k]) continue;
    seen.add(k);
    out.push(t);
    for (const n of near4(t)) if (!seen.has(K(n.x, n.y)) && L.oil[K(n.x, n.y)]) q.push(n);
  }
  return out;
}
// คนที่ยืนทับชุดช่องนี้ (ตัวใหญ่ = ช่องไหนของตัวก็ได้)
function unitsOn(engine, tiles) {
  const set = new Set(tiles.map((t) => K(t.x, t.y)));
  return Object.values(engine.players).filter((u) => u.alive && u.pos
    && Board.footprint(u.pos.x, u.pos.y, engine.sizeOf(u)).some((c) => set.has(K(c.x, c.y))));
}
const netted = (t) => ((t && t.statuses && t.statuses.diegoNet) || 0) > 0;

// ระเบิด: ทุกคนในชุดช่อง (ไม่นับผู้จุด/เพื่อนร่วมทีม) −2 + ลุกไหม้ → ช่องทั้งหมดเป็นกองไฟ (นับเวลาใหม่) · คืนรายชื่อที่โดน
function explode(engine, p, tiles, at) {
  const L = layers(engine);
  const hits = [];
  for (const t of unitsOn(engine, tiles)) {
    if (!foe(engine, p, t)) continue;
    hits.push(t.id);
    const burn = netted(t) ? NET_BURN : BURN;
    hurt(engine, p, t, EXPLODE_DMG, `${p.name} ระเบิดน้ำมัน`);
    if (t.alive && engine.applyBurn(t, burn) > 0) engine.log(`🔥 ${t.name} ลุกไหม้ ${burn} เทิร์น`);
  }
  const until = engine.roundNumber + FIRE_TURNS;
  for (const t of tiles) {
    const k = K(t.x, t.y);
    delete L.oil[k];
    delete L.ash[k];
    L.fire[k] = { owner: p.id, until };
  }
  engine.hitArea(p, tiles, hits);
  fx(engine, p, "explode", { at: tile(at), tiles: tiles.map(tile), hits, frozen: stopping(p) });
  engine.sfx(SFX.explode);
  engine.log(`💥 ${p.name} จุดระเบิดน้ำมัน ${tiles.length} ช่อง — กองไฟ ${FIRE_TURNS} เทิร์น`);
  addCunning(engine, p, 1);
  return hits;
}
// ช่องรอบช่อง t (รวมตัวเอง) ที่เป็นกองไฟอยู่ไหม — น้ำมันใหม่ติดไฟ
const touchesFire = (engine, tiles) => tiles.some((t) => fireAt(engine, t.x, t.y) || near4(t).some((n) => fireAt(engine, n.x, n.y)));

// ---------- คลังเครื่องมือ ----------
function throwOil(engine, p, at) {
  const L = layers(engine);
  const tiles = square3(engine, at);
  fx(engine, p, "throw", { item: "oil", from: { ...p.pos }, to: tile(at), frozen: stopping(p) });
  engine.sfx(SFX.throw);
  for (const t of tiles) {
    const k = K(t.x, t.y);
    if (L.fire[k]) continue; // ทับกองไฟ = ติดไฟทันที (ด้านล่าง)
    delete L.ash[k];
    L.oil[k] = { owner: p.id };
  }
  const soaked = [];
  for (const t of unitsOn(engine, tiles)) {
    if (!foe(engine, p, t)) continue;
    if (engine.applyDebuff(t, "oilSoaked", 1, turnsFor(engine, t, OIL_SOAK_TURNS))) soaked.push(t.id);
  }
  engine.hitArea(p, tiles, unitsOn(engine, tiles).map((u) => u.id));
  fx(engine, p, "oil", { at: tile(at), tiles: tiles.map(tile), soaked });
  engine.sfx(SFX.splash);
  engine.log(`🛢️ ${p.name} โยนถังน้ำมัน${soaked.length ? ` — ${soaked.map((id) => engine.players[id].name).join(", ")} ชุ่มน้ำมัน` : ""}`);
  if (soaked.length) addCunning(engine, p, 1);
  let secs = (DIEGO_FX.throw + DIEGO_FX.oil) / 1000;
  // ติด/ทับกองไฟ = ไฟลาม: ระเบิดทั้งแอ่งที่ต่อกัน + ช่องที่ทับกองไฟ
  if (touchesFire(engine, tiles)) {
    const pool = oilPool(engine, tiles);
    const onFire = tiles.filter((t) => L.fire[K(t.x, t.y)]);
    const blast = [...pool, ...onFire.filter((t) => !pool.some((q) => q.x === t.x && q.y === t.y))];
    if (blast.length) { explode(engine, p, blast, at); secs += DIEGO_FX.explode / 1000; }
  }
  return secs;
}
function throwMatch(engine, p, at, targets) {
  const L = layers(engine);
  fx(engine, p, "throw", { item: "match", from: { ...p.pos }, to: tile(at), frozen: stopping(p) });
  engine.sfx(SFX.match);
  let secs = DIEGO_FX.throw / 1000;
  const t = (targets || []).map((id) => engine.players[id]).find((u) => foe(engine, p, u)) || null;
  // ชุดช่องที่ระเบิด: แอ่งน้ำมันใต้ไม้ขีด · คนชุ่มน้ำมัน = 3×3 รอบตัว (+แอ่งที่ระเบิดแตะ)
  let blast = L.oil[K(at.x, at.y)] ? oilPool(engine, [at]) : [];
  if (t && ((t.statuses.oilSoaked || 0) > 0)) {
    delete t.statuses.oilSoaked;
    const around = square3(engine, { x: t.pos.x + Math.floor((engine.sizeOf(t) - 1) / 2), y: t.pos.y + Math.floor((engine.sizeOf(t) - 1) / 2) });
    const pool = oilPool(engine, around);
    for (const c of [...around, ...pool]) if (!blast.some((q) => q.x === c.x && q.y === c.y)) blast.push(c);
  }
  if (blast.length) {
    explode(engine, p, blast, at);
    return secs + DIEGO_FX.explode / 1000;
  }
  if (t) {
    const burn = netted(t) ? NET_BURN : BURN;
    const got = engine.applyBurn(t, burn);
    t.wasAttacked = true;
    engine.hitArea(p, [at], [t.id]);
    fx(engine, p, "ignite", { targetId: t.id, turns: burn, frozen: stopping(p) });
    engine.sfx(SFX.fire);
    engine.log(got > 0 ? `🔥 ${p.name} โยนไม้ขีดใส่ ${t.name} — ลุกไหม้ ${burn} เทิร์น` : `🔥 ${t.name} ต้านไฟจากไม้ขีดไว้ได้`);
    return secs + DIEGO_FX.ignite / 1000;
  }
  engine.log(`🔥 ${p.name} โยนไม้ขีดไฟ — ไม่โดนอะไร`);
  return secs;
}
function placeNet(engine, p, at) {
  const s = st(p);
  const tiles = square3(engine, at);
  s.nets.push({ x: at.x, y: at.y, seq: ++s.netSeq });
  engine.boardFxTo([p.id], "diegoFx", { kind: "throw", id: p.id, color: engine.colorOf(p), item: "net", from: { ...p.pos }, to: tile(at), frozen: stopping(p) });
  engine.boardFxTo([p.id], "diegoFx", { kind: "net", id: p.id, color: engine.colorOf(p), at: tile(at), tiles: tiles.map(tile) });
  engine.sfx(SFX.net, [p.id]);
  engine.log(`🕸️ ${p.name} วางบางอย่างไว้`);
  return DIEGO_FX.throw / 1000;
}
// ช่องแรกในแนว (ทิศ dir · ยาว len) ที่มีศัตรู → { hit, end } (ทะลุสิ่งกีดขวาง — สิ่งกีดขวางไม่บังการโจมตี)
function lineShot(engine, p, dir, len) {
  const tiles = engine.chargeTiles(p, dir, len);
  for (const t of tiles) {
    const u = t.unitId ? engine.players[t.unitId] : null;
    if (foe(engine, p, u)) return { hit: u, end: tile(t), tiles };
  }
  return { hit: null, end: tiles.length ? tile(tiles[tiles.length - 1]) : { ...p.pos }, tiles };
}
function knife(engine, p, dir) {
  const { hit, end, tiles } = lineShot(engine, p, dir, KNIFE.len);
  if (hit) hurt(engine, p, hit, KNIFE.dmg, `${p.name} มีด`);
  engine.hitArea(p, tiles, hit ? [hit.id] : []);
  fx(engine, p, "knife", { from: { ...p.pos }, dir, to: end, hitId: hit ? hit.id : null, frozen: stopping(p) });
  engine.sfx(SFX.knife);
  if (!hit) engine.log(`🗡️ ${p.name} ขว้างมีด — ไม่โดนใคร`);
  return DIEGO_FX.knife / 1000;
}
function firstAid(engine, p) {
  const s = st(p);
  s.aid = Math.max(0, s.aid - 1);
  const hp = engine.healHp(p, AID.hp);
  const ar = engine.healArmor(p, AID.armor);
  fx(engine, p, "firstAid", { at: { ...p.pos } });
  engine.sfx(SFX.heal);
  engine.log(`🩹 ${p.name} เครื่องปฐมพยาบาล — พลังชีวิต +${hp} · เกราะ +${ar} (เหลือ ${s.aid} ครั้ง)`);
  return DIEGO_FX.firstAid / 1000;
}
// โควตาคลังเครื่องมือของเทิร์นนี้ → ใช้ได้อีกกี่ครั้ง · ตาหยุดเวลา = สกิลที่กดได้อีก (รวมทุกช่อง)
function toolLeft(engine, p) {
  const s = st(p);
  if (s.stopping) return stopLeft(p);
  return TOOL_PER_TURN - (s.toolRound === engine.roundNumber ? s.toolUsed : 0);
}
const stopLeft = (p) => Math.max(0, STOP_SKILLS - (st(p).stopUses || 0));
function toolOk(engine, p, key) {
  const s = st(p);
  if (!TOOLS[key]) return false;
  const left = toolLeft(engine, p);
  if (left !== null && left <= 0) return false;
  if (key === "aid") return s.aid > 0;
  if (key === "net") return s.nets.length < NET_MAX;
  return true;
}
function useTool(engine, p, key, targets, opts) {
  const s = st(p);
  if (!s.stopping) {
    if (s.toolRound !== engine.roundNumber) { s.toolRound = engine.roundNumber; s.toolUsed = 0; }
    s.toolUsed++;
  }
  addCunning(engine, p, 1);
  let secs = 0;
  if (key === "oil") secs = throwOil(engine, p, opts.tile);
  else if (key === "match") secs = throwMatch(engine, p, opts.tile, targets);
  else if (key === "net") secs = placeNet(engine, p, opts.tile);
  else if (key === "knife") secs = knife(engine, p, opts.dir);
  else if (key === "aid") secs = firstAid(engine, p);
  if (secs > 0) engine.skillBeat(secs, () => {});
}

// ---------- ตาข่าย ----------
// ตาข่ายของศัตรูที่คลุมช่องนี้ → { owner, net } | null
function netOver(engine, u, x, y) {
  for (const d of Object.values(engine.players)) {
    if (!isDiego(d) || !d.diego || !foe(engine, d, u)) continue;
    const net = d.diego.nets.find((n) => Math.abs(n.x - x) <= 1 && Math.abs(n.y - y) <= 1);
    if (net) return { ownerId: d.id, seq: net.seq };
  }
  return null;
}
function netOverUnit(engine, u) {
  for (const c of Board.footprint(u.pos.x, u.pos.y, engine.sizeOf(u))) {
    const hit = netOver(engine, u, c.x, c.y);
    if (hit) return hit;
  }
  return null;
}
// ตาข่ายทำงาน: ดึงไปช่องกลาง (ไม่ว่าง = อยู่ที่เดิม · ตัวใหญ่ไม่ถูกดึง) + ตรึง 1 เทิร์น → ตาข่ายหาย
function spring(engine, u, info) {
  const d = engine.players[info.ownerId];
  if (!d || !d.diego) return;
  const net = d.diego.nets.find((n) => n.seq === info.seq);
  if (!net) return;
  d.diego.nets = d.diego.nets.filter((n) => n !== net);
  engine.withEffectSource(d, () => {
    const from = { ...u.pos };
    if (engine.sizeOf(u) <= 1 && (from.x !== net.x || from.y !== net.y) && engine.tileFree(net.x, net.y, u.id)) {
      engine.ice.revealPushed(u);
      u.pos = { x: net.x, y: net.y };
    }
    const turns = turnsFor(engine, u, NET_ROOT);
    const rooted = engine.applyDebuff(u, "rooted", 1, turns);
    if (rooted) engine.applyDebuff(u, "diegoNet", 1, turns);
    u.wasAttacked = true;
    fx(engine, d, "netTrap", { targetId: u.id, from, to: { ...u.pos }, tiles: square3(engine, net).map(tile) });
    engine.sfx(SFX.netTrap);
    engine.log(rooted ? `🕸️ ${u.name} ติดตาข่ายของ ${d.name} — ถูกตรึง ${NET_ROOT} เทิร์น` : `🕸️ ${u.name} ติดตาข่ายของ ${d.name} แต่ต้านการตรึงไว้ได้`);
    addCunning(engine, d, 1);
  });
}

// ---------- ปืนลูกโม่ ----------
// ตาปกติ: ตาละ 1 นัด · ตาหยุดเวลา: ยิงได้ตามโควตาสกิล 5 ครั้ง (ไม่จำกัดนัดต่อตา)
function shotUsed(engine, p) {
  const s = st(p);
  return s.stopping ? stopLeft(p) <= 0 : s.shotRound === engine.roundNumber;
}
function spendAmmo(engine, p, n) {
  const s = st(p);
  s.ammo = Math.max(0, s.ammo - n);
  if (s.ammo <= 0) {
    s.reloadRound = engine.roundNumber + GUN.reload;
    engine.sfx(SFX.empty);
    engine.log(`🔫 ${p.name} กระสุนหมด — รีโหลด ${GUN.reload} เทิร์น`);
  }
}
function shoot(engine, p, dir) {
  const s = st(p);
  if (!s.stopping) s.shotRound = engine.roundNumber;
  spendAmmo(engine, p, 1);
  const { hit, end, tiles } = lineShot(engine, p, dir, GUN.len);
  if (hit) hurt(engine, p, hit, GUN.dmg, `${p.name} ปืนลูกโม่`);
  engine.hitArea(p, tiles, hit ? [hit.id] : []);
  fx(engine, p, "shot", { from: { ...p.pos }, dir, to: end, hitId: hit ? hit.id : null, frozen: s.stopping });
  engine.sfx(SFX.shot);
  if (!hit) engine.log(`🔫 ${p.name} ยิงปืนลูกโม่ — ไม่โดนใคร`);
  engine.skillBeat(DIEGO_FX.shot / 1000, () => {});
}

// ---------- เดอะเวิลด์ / หยุดเวลา ----------
function startStop(engine, p, kind, attackerId) {
  const s = st(p);
  s.stopping = true;
  s.stopKind = kind;
  s.stopUses = 0;
  s.savedQuota = !!p.skillUsedRound;
  p.skillUsedRound = false; // ตาใหม่เต็มๆ
  engine.timeStop.freeze(p.id);
  fx(engine, p, "timeStop", { at: { ...p.pos }, mode: kind, attackerId: attackerId || null });
  engine.sfx(SFX.stop);
  engine.sfx(VOICE_TRIGGER[kind], null, { voice: p.id });
  engine.log(kind === "counter" ? `⏱️ ${p.name} เดอะเวิลด์! — หยุดเวลา` : `⏱️ ${p.name} เดอะเวิลด์ — หยุดเวลาก่อนทุกคน`);
  engine.skillBeat(DIEGO_FX.timeStop / 1000, () => {}); // นาฬิกาเดินวน = client เล่นเองตลอดที่ state.timeFreeze (Game.jsx)
  engine.pausePlayingForCutscene();
}
// เวลาเดินต่อ: ดาเมจ/การตายที่ค้างไว้ลงพร้อมกัน → วินาทีพักฉาก
function endStop(engine, p) {
  const s = st(p);
  if (!s.stopping) return 0;
  s.stopping = false;
  s.stopKind = null;
  p.skillUsedRound = s.savedQuota;
  const hits = engine.timeStop.unfreeze();
  fx(engine, p, "timeResume", { at: p.pos ? { ...p.pos } : null, hits });
  engine.sfx(SFX.resume);
  engine.log(`⏱️ เวลาเริ่มเดินต่อ`);
  return DIEGO_FX.timeResume / 1000;
}

// ---------- เป็นไปดั่งกลอุบาย ----------
// พุ่งตามแนว: หยุดก่อนสิ่งกีดขวาง/ร้านค้า/เพื่อน/ขอบ · ศัตรูคนแรก = ชน → { path, hit, before }
function planPlot(engine, p, dir) {
  const tiles = engine.chargeTiles(p, dir, PLOT.len);
  const path = [{ ...p.pos }];
  for (const t of tiles) {
    const u = t.unitId ? engine.players[t.unitId] : null;
    if (foe(engine, p, u)) return { path, hit: u, at: tile(t) };
    if (t.obstacle || t.shop || u) break;
    path.push(tile(t));
  }
  return { path, hit: null, at: null };
}
function plot(engine, p, dir) {
  if (!p.alive || !p.pos) return;
  const v = Board.LINE_DIRS[dir];
  const { path, hit, at } = planPlot(engine, p, dir);
  let push = null;
  if (hit) {
    hurt(engine, p, hit, PLOT.dmg, `${p.name} เป็นไปดั่งกลอุบาย`);
    if (hit.alive && engine.applyBleed(hit, PLOT.bleed) > 0) engine.log(`🩸 ${hit.name} เลือดไหล ${PLOT.bleed}`);
    // กระเด็นตามทิศ 2 ช่อง (ชน = หยุด ไม่เสียเพิ่ม · ตัวใหญ่ไม่กระเด็น) แล้วดิเอโก้ยืนช่องเดิมของเป้า
    if (hit.alive && hit.pos && engine.sizeOf(hit) <= 1) {
      const from = { ...hit.pos };
      let to = { ...from };
      for (let i = 0; i < PLOT.push; i++) {
        const nx = to.x + v[0], ny = to.y + v[1];
        if (!engine.tileFree(nx, ny, hit.id)) break;
        to = { x: nx, y: ny };
      }
      if (to.x !== from.x || to.y !== from.y) {
        engine.ice.revealPushed(hit);
        hit.pos = to;
        push = { from, to: { ...to } };
      }
    }
    const land = at && engine.tileFree(at.x, at.y, p.id) ? at : path[path.length - 1];
    if (land.x !== path[path.length - 1].x || land.y !== path[path.length - 1].y) path.push({ ...land });
    p.pos = { ...land };
  } else {
    p.pos = { ...path[path.length - 1] };
    engine.log(`🐎 ${p.name} พุ่งไปสุดทาง — ไม่ชนใคร`);
  }
  engine.hitArea(p, path, hit ? [hit.id] : []);
  fx(engine, p, "plot", { from: { ...path[0] }, dir, path, hitId: hit ? hit.id : null, push });
  engine.sfx(SFX.gallop);
  engine.skillBeat((DIEGO_FX.plotBase + DIEGO_FX.plotPerTile * path.length) / 1000, () => {
    if (!hit) return;
    engine.sfx(SFX.crash);
    if (push) engine.ice.forcedSlides([{ id: hit.id, from: push.from, to: push.to, dir: { x: v[0], y: v[1] } }], p);
    engine.queueCutscene(p, CUT.final);
  });
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, VOICE, HP, ARMOR, MOV, MOV_HORSE, RANGE, TOOL_PER_TURN, THROW_RANGE, OIL_SOAK_TURNS, OIL_SLOW,
  EXPLODE_DMG, BURN, NET_BURN, FIRE_TURNS, NET_MAX, NET_ROOT, KNIFE, AID, GUN, WORLD, PLOT, CUNNING_MAX, HORSE, DIEGO_FX, TOOLS,
  isDiego,

  resetCombat(p) { p.diego = isDiego(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  mov(p) { return isDiego(p) ? (st(p).mounted ? MOV_HORSE : MOV) : null; },
  // ตาหยุดเวลา: ตีปกติไม่ได้ (เปลี่ยนเป็นกดสกิล 5 ครั้ง — ผู้ใช้สั่ง) · ปืน GUTS ก็ไม่ได้
  range(p) { return isDiego(p) ? (st(p).stopping ? [1, 0] : RANGE) : null; },
  blocksGuts(engine, p) { return stopping(p); },
  voiceLines(p) { return isDiego(p) ? VOICE : null; },
  // ตีปกติระหว่างหยุดเวลา: ไม่ขึ้นเลขตอนปะทะ (ดาเมจโชว์ตอนเวลาเดินต่อ)
  deferStrikeDamage(p) { return stopping(p); },

  // ---------- ม้า ----------
  absorbDamage(engine, p) { return isDiego(p) && Horse.absorb(engine, p, st(p), horseCfg); },
  hudActions(engine, p) { return isDiego(p) && p.alive ? [Horse.action(engine, p, st(p))] : undefined; },
  charAction(engine, p, key) { return isDiego(p) && key === "horse" && Horse.toggle(engine, p, st(p), horseCfg); },

  // ---------- สกิล ----------
  skillCost(p, tier, base, opts) {
    if (!isDiego(p)) return base;
    if (tier === "basic") {
      const t = TOOLS[opts && opts.form];
      if (!t) return base;
      return opts.form === "knife" && st(p).stopping ? KNIFE.stopCost : t.cost;
    }
    if (tier === "ultimate") return st(p).stopping ? PLOT.cost : 0; // เดอะเวิลด์ใช้เล่ห์เหลี่ยม (ไม่ใช้แต้มสกิล)
    return base;
  },
  skillArea(p, tier, area, opts) {
    if (!isDiego(p)) return area;
    if (tier === "basic") { const t = TOOLS[opts && opts.form]; return t ? t.area : area; }
    if (tier === "ultimate" && st(p).stopping) return PLOT_SKILL.area;
    return area;
  },
  skillPub(p, tier) {
    if (!isDiego(p)) return null;
    const s = st(p);
    if (tier === "basic") {
      return {
        choices: TOOL_KEYS.map((k) => ({
          key: k, name: TOOLS[k].name, img: TOOLS[k].img, desc: TOOLS[k].desc, area: TOOLS[k].area,
          cost: k === "knife" && s.stopping ? KNIFE.stopCost : TOOLS[k].cost,
          ...(k === "aid" ? { left: s.aid, locked: s.aid <= 0 } : {}),
          ...(k === "net" ? { left: NET_MAX - s.nets.length, locked: s.nets.length >= NET_MAX } : {}),
        })),
      };
    }
    if (tier === "ultimate" && s.stopping) return { ...PLOT_SKILL, flash: true };
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isDiego(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    if (tier === "basic") return toolOk(engine, p, opts.form) && (TOOLS[opts.form].area.kind !== "tile" || !!opts.tile);
    if (tier === "secondary") return s.ammo > 0 && !shotUsed(engine, p);
    if (tier === "ultimate") {
      if (s.stopping) return stopLeft(p) > 0 && s.ammo >= PLOT.ammo && s.mounted; // กลอุบาย: ต้องขี่ม้า (ผู้ใช้สั่ง 2026-10-20)
      return s.cunning >= WORLD.cunning && cdLeft(s.worldReady, engine.roundNumber) === 0 && s.armedRound !== engine.roundNumber;
    }
    return false;
  },
  // คลังเครื่องมือ / ปืน: ไม่กินโควตาสกิล · คลังเครื่องมือไม่ล็อกการเดิน (ปืนล็อก)
  //  ตาหยุดเวลา: ทุกช่องใช้โควตา 5 ครั้งของตัวเองแทน (canUseSkill)
  skipsTurnQuota(p, tier) { return isDiego(p) && (tier === "basic" || tier === "secondary" || st(p).stopping); },
  ignoresTurnQuota(p, tier) { return isDiego(p) && (tier === "basic" || tier === "secondary" || st(p).stopping); },
  keepsMove(engine, p, tier) { return isDiego(p) && tier === "basic"; },
  // กลอุบาย: ใช้แล้วเวลาเดินต่อ + จบตา · ผลของสกิลโจมตีพื้นที่ลงเองตามทางที่พุ่งจริง (hitArea)
  endsTurn(engine, p, tier) { return isDiego(p) && tier === "ultimate" && st(p).stopping; },
  ownsAreaHit(p, tier) { return isDiego(p) && (tier === "basic" || tier === "secondary" || tier === "ultimate"); },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isDiego(p)) return "";
    const s = st(p);
    if (s.stopping) s.stopUses = (s.stopUses || 0) + 1; // โควตาตาหยุดเวลา (ทุกช่อง)
    if (tier === "basic") { useTool(engine, p, opts.form, targets, opts); return ` — ${TOOLS[opts.form].name}`; }
    if (tier === "secondary") { shoot(engine, p, opts.dir); return ""; }
    if (tier === "ultimate" && s.stopping) {
      spendAmmo(engine, p, PLOT.ammo);
      engine.log(`🐎 ${p.name} เป็นไปดั่งกลอุบาย`);
      engine.queueCutscene(p, CUT.intro);
      engine.deferAfterCutscene(() => plot(engine, p, opts.dir));
      return "";
    }
    if (tier === "ultimate") {
      // ศัตรูไม่รู้ว่ากดแล้ว: เอฟเฟกต์/เสียง/เสียงพากย์ส่งเฉพาะฝ่ายตัวเอง · ไม่ขึ้นป้ายสกิล (silentFlash) · ไม่ลง log
      //  ไม่พักฉาก (การพักฉากบอกใบ้ได้) · ศัตรูเห็นเล่ห์เหลี่ยม/คูลดาวน์เป็น null (diegoState / skillLocks)
      s.cunning -= WORLD.cunning;
      s.armedRound = engine.roundNumber;
      s.worldReady = engine.roundNumber + WORLD.cd;
      const side = sideIds(engine, p);
      engine.boardFxTo(side, "diegoFx", { kind: "world", id: p.id, color: engine.colorOf(p), at: { ...p.pos } });
      engine.sfx(SFX.world, side);
      engine.sfx(VOICE_WORLD, side, { voice: p.id });
      return "";
    }
    return "";
  },
  // กดเดอะเวิลด์: ไม่ขึ้นป้ายสกิลให้ใครเห็น (ศัตรูต้องไม่รู้)
  silentFlash(p, tier) { return isDiego(p) && tier === "ultimate" && !st(p).stopping; },
  skillLocks(engine, p, viewer) {
    if (!isDiego(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const left = toolLeft(engine, p);
    if (viewer && !allyView(engine, p, viewer) && !s.stopping) return undefined; // ศัตรูไม่เห็นคูลดาวน์/ล็อก (บอกใบ้เดอะเวิลด์)
    return {
      basic: { cd: 0, locked: left !== null && left <= 0, free: true },
      secondary: { cd: s.ammo > 0 ? 0 : cdLeft(s.reloadRound, r), locked: s.ammo <= 0 || shotUsed(engine, p), free: true },
      ultimate: s.stopping
        ? { cd: 0, locked: stopLeft(p) <= 0 || s.ammo < PLOT.ammo || !s.mounted }
        : { cd: cdLeft(s.worldReady, r), locked: s.cunning < WORLD.cunning || s.armedRound === r },
    };
  },

  // ---------- เดอะเวิลด์ (server/timeStop.js) ----------
  // ตั้งรับอยู่ (กดเทิร์นนี้ · ยังไม่ทำงาน) — ศัตรูทำให้เสียหาย = ตัดการกระทำ
  counterArmed(engine, p) { return isDiego(p) && p.alive && !st(p).stopping && st(p).armedRound === engine.roundNumber && engine.roundNumber > 0; },
  onCounterStop(engine, p, attacker) {
    if (!isDiego(p)) return;
    const s = st(p);
    s.armedRound = 0;
    s.counterBy = attacker ? attacker.id : null;
    engine.log(`⏱️ ${attacker ? attacker.name : "ศัตรู"} โจมตี ${p.name} — แต่เวลาหยุดลงแล้ว`);
    engine.timeStop.queueExtra(p.id, "counter");
  },
  onEndTurn(engine) {
    const L = engine.board && engine.board.diego;
    if (L) {
      const ash = [];
      for (const [k, f] of Object.entries(L.fire)) {
        if (engine.roundNumber + 1 < f.until) continue;
        delete L.fire[k];
        L.ash[k] = 1;
        const [x, y] = k.split(",").map(Number);
        ash.push({ x, y });
      }
      if (ash.length) engine.boardFx("diegoFx", { kind: "ash", tiles: ash });
    }
    for (const p of Object.values(engine.players)) {
      if (!isDiego(p) || !p.diego) continue;
      const s = p.diego;
      if (s.armedRound === engine.roundNumber && p.alive) s.pendingNormal = true; // ไม่โดนตี → ต้นเทิร์นหน้า
      s.armedRound = 0;
    }
  },
  onOrderBegin(engine) {
    const order = engine.turnOrder || [];
    const ds = Object.values(engine.players).filter((p) => isDiego(p) && p.diego && p.diego.pendingNormal);
    ds.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    for (const p of ds) {
      p.diego.pendingNormal = false;
      if (p.alive && p.pos) engine.timeStop.queueExtra(p.id, "normal");
    }
  },
  onExtraTurn(engine, p, kind) {
    if (!isDiego(p) || (kind !== "counter" && kind !== "normal")) return;
    const by = st(p).counterBy;
    st(p).counterBy = null;
    startStop(engine, p, kind, kind === "counter" ? by : null);
  },
  extraTurnOutro(engine, p) { return isDiego(p) ? endStop(engine, p) : 0; },

  // ---------- ชั้นพื้น / ตาข่าย (ฮุค broadcast — ทำงานกับทุกคน) ----------
  // เริ่มตาเดินบนแอ่งน้ำมันของคนอื่น = เดิน −1
  movPenalty(engine, p, from) {
    const o = oilAt(engine, from.x, from.y);
    if (!o) return 0;
    const owner = engine.players[o.owner];
    return owner && (owner.id === p.id || engine.sameTeam(owner, p)) ? 0 : OIL_SLOW;
  },
  walkTrap(engine, p, t) { return netOver(engine, p, t.x, t.y); },
  springTrap(engine, p, t, info) { spring(engine, p, info); },
  onForcedMove(engine, u) {
    if (!u.pos) return;
    const info = netOverUnit(engine, u);
    if (info) spring(engine, u, info);
  },
  // ต้นเทิร์น: ยืนบนกองไฟของคนอื่น = ลุกไหม้ 1 · ดิเอโก้: รีโหลดครบ = กระสุนเต็ม
  onRoundStartTick(engine, p) {
    if (isDiego(p) && p.diego && p.diego.ammo <= 0 && engine.roundNumber >= p.diego.reloadRound) {
      p.diego.ammo = GUN.ammo;
      if (p.pos) fx(engine, p, "reload", { at: { ...p.pos } });
      engine.sfx(SFX.reload);
      engine.log(`🔫 ${p.name} รีโหลดปืนลูกโม่เต็ม ${GUN.ammo} นัด`);
    }
    if (!p.alive || !p.pos) return;
    for (const c of Board.footprint(p.pos.x, p.pos.y, engine.sizeOf(p))) {
      const f = fireAt(engine, c.x, c.y);
      const owner = f && engine.players[f.owner];
      if (!f || (owner && (owner.id === p.id || engine.sameTeam(owner, p)))) continue;
      const burn = () => engine.applyBurn(p, BURN);
      const got = owner ? engine.withEffectSource(owner, burn) : burn();
      if (got > 0) {
        engine.log(`🔥 ${p.name} ยืนอยู่บนกองไฟ — ลุกไหม้ ${BURN} เทิร์น`);
        engine.boardFx("diegoFx", { kind: "burn", id: owner ? owner.id : null, targetId: p.id, at: { x: c.x, y: c.y } });
        if (owner && isDiego(owner) && owner.alive) addCunning(engine, owner, 1);
      }
      break;
    }
  },
  boardPublic(engine) {
    const L = engine.board && engine.board.diego;
    if (!L) return {};
    const list = (o) => Object.keys(o).map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; });
    return {
      diego: {
        oil: list(L.oil),
        fire: Object.entries(L.fire).map(([k, f]) => { const [x, y] = k.split(",").map(Number); return { x, y, left: Math.max(1, f.until - engine.roundNumber) }; }),
        ash: list(L.ash),
      },
    };
  },
  // เปลี่ยนแผนที่ = ตาข่ายหายหมด (ชั้นพื้นอยู่กับ match.board — หายเอง)
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) if (isDiego(p) && p.diego) p.diego.nets = [];
  },
  onDeath(engine, p) {
    if (!isDiego(p) || !p.diego) return;
    p.diego.nets = [];
    p.diego.armedRound = 0;
    p.diego.pendingNormal = false;
    if (p.diego.stopping) endStop(engine, p);
  },

  // ---------- ข้อมูลให้ client (GRID_PLAN §7.12 สัญญาข้อมูล) ----------
  diegoState(engine, p, viewer) {
    if (!isDiego(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const mine = !!viewer && (viewer.id === p.id);
    const ally = allyView(engine, p, viewer);
    return {
      // ศัตรู: เล่ห์เหลี่ยม/เดอะเวิลด์เป็น null (เล่ห์เหลี่ยมลด 5 = บอกใบ้ว่ากดแล้ว)
      cunning: ally ? s.cunning : null, cunningMax: CUNNING_MAX,
      ammo: s.ammo, ammoMax: GUN.ammo, reloadCd: s.ammo > 0 ? 0 : cdLeft(s.reloadRound, r),
      firstAid: s.aid, toolLeft: toolLeft(engine, p), shot: shotUsed(engine, p),
      worldArmed: ally ? s.armedRound === r : null, worldCd: ally ? cdLeft(s.worldReady, r) : null, stopping: !!s.stopping,
      mounted: s.mounted, horseHp: s.horseHp, horseCd: Horse.cooldown(engine, s),
      nets: mine ? s.nets.map((n) => ({ x: n.x, y: n.y })) : undefined,
    };
  },
};

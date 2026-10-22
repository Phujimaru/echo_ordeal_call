// ============================================================
//  ไจโร เซปเปลี่ (Gyro Zeppeli — JoJo Part 7) — ระดับยาก · id "gyro_zeppeli" · เลือกซ้ำได้หลายคน
//  กติกาทั้งหมดผู้ใช้ตัดสิน 2026-10-20 — GRID_PLAN.md §7.11 (แหล่งความจริง + สัญญาข้อมูล server ↔ client)
//
//  พลังชีวิต 6 · เกราะ 2 · เดิน 4 (ขี่ม้า 5) · ตีปกติ [1, 4] (ขี่ม้า [1, 5]) · เริ่มเกมขี่ม้า · ลูกเหล็ก 2 ลูก
//  ตีปกติ/ตีสวน ใช้ลูก 1 ลูก (ไม่มีลูกในมือ = range [1, 0] ตีไม่ได้ · ปืน GUTS ยังยิงได้) — ลูกตกช่องที่เป้ายืน (ก่อนถูกผลัก)
//    ตีโดน = ผลักเป้า 1 ช่องหลังฉากตี (ชน = ไม่ขยับ ไม่เสียเพิ่ม · ตัวใหญ่ไม่ถูกผลัก) · หลบพ้น = ไม่ผลัก
//    เป้าตีสวนได้ก่อนถูกผลัก · ไจโรตีสวน = ลูกผลักผู้ตี 1 ช่องแทนการถอยปกติ (ฮุค counterPush)
//  กลับคืนเจ้าของ (พื้นฐาน 0): ลูกเก่าสุดวิ่งกลับเป็นเส้นแตะทุกช่อง (ทแยงได้) — ศัตรูบนเส้น −1 · ฟื้นพลังชีวิตลูกละ 1 (เทิร์นละ ≤ 2)
//    ไม่ล็อกการเดิน · ไม่กินโควตา · กดซ้ำได้
//  วิชาลับไจโร (รอง 4 + ทองคำ 5 · ลูกในมือ ≥ 1): line 8×1 — ศัตรูทุกคนในแนว −1 ขาไป −1 ขากลับ แล้วถูกดึงเข้าหา 4 ช่อง (คนใกล้ก่อน)
//  การหมุนที่สมบูรณ์แบบ (ท่าไม้ตาย 6 + ทองคำ 20 · ลูก 2 + ขี่ม้า · คูลดาวน์ 3 นับจากตอนกด): เสริมตีปกติครั้งถัดไปในตาเดินนั้น
//    ตีโดน = เป้ากระเด็น 1 ใน 8 ทิศจนสุดขอบ (พังสิ่งกีดขวาง · ข้ามสิ่งที่พังไม่ได้ · ดันคนที่ขวางออกข้าง ศัตรู −1)
//    ดาเมจ = ช่องที่กระเด็น ≤ 6 (fixedStrikeDamage — ไม่รับบัฟ) · ถูกตรึง 2 เทิร์น (ต้านได้) · จบตาโดยไม่ตี = เสริมหมด ไม่คืน
//  การหมุนทองคำ (ติดตัว): ขี่ม้าเดิน = สัดส่วนทองคำ + ช่วงเดินตรงยาวสุดของตา (afterWalk · ย้อนเดินได้) สูงสุด 30
//  ม้าคู่ใจ วาลคิรี (ปุ่มพิเศษบน HUD — hudActions/charAction): เลือด 3 รับดาเมจก่อนเกราะ (absorbDamage) · ตาย = เรียกไม่ได้ 2 เทิร์น
//
//  ทุกอย่างเก็บที่ p.gyro (ไจโรหลายคนในแมตช์ไม่ปนกัน) · ดาเมจจากลูกห่อ withEffectSource(เจ้าของลูก)
//  เอฟเฟกต์: engine.boardFx("gyroFx", { kind, id, color, … }) — client/src/board/gyroFx.js (session gyro-fx)
//   server ลงผลทั้งหมดตอนส่งเหตุการณ์ (แบบ iceFx) แล้วพักฉากตาม GYRO_FX (ms) ผ่าน engine.skillBeat
// ============================================================
const Board = require("../server/board");

const ID = "gyro_zeppeli";
const DIR = "/characters/gyro_zeppeli";
const IMG = {
  base: `${DIR}/gyro.webp`,
  skill1: `${DIR}/gyro_skill1.webp`,
  skill2: `${DIR}/gyro_skill2.jpg`,
  skill3: `${DIR}/gyro_skill3.webp`,
  horse: `${DIR}/valkyrie.png`,
};
// เสียงเอฟเฟกต์ (client/src/audio.js — ไฟล์ sfx/*.mp3 · GRID_PLAN §7.11 ตารางเสียง)
const SFX = {
  spin: "gyro_spin",                 // ลูกหมุน — ครั้งเดียวตอนลูกออกบิน (ห้ามวน — ผู้ใช้สั่ง)
  throw: "gyro_throw",
  hit: "gyro_hit",                   // กระทบ — เสียงตีปกติ (ฉากตีเล่นตอนปะทะ)
  recall: "gyro_recall",
  secret: "gyro_secret",
  secretReturn: "gyro_secret_return",
  goldenCharge: "gyro_golden_charge",
  breaker: "gyro_breaker",           // ตีเสริมโดน — เสียงตีปกติระหว่างเสริม
  fly: "gyro_fly",
  shove: "gyro_shove",
  goldenTick: "gyro_golden_tick",
};
// เสียงพากย์ตามเหตุการณ์ (server/voice.js) — สุ่ม 1 คีย์ต่อครั้ง
const VOICE = {
  turn: ["gyro_v_start_1", "gyro_v_start_2"],
  strike: ["gyro_v_hit_1", "gyro_v_hit_2", "gyro_v_hit_3"],
  struck: ["gyro_v_hitby_1"],
  basic: ["gyro_v_skill1"],
  secondary: ["gyro_v_skill2"],
  ultimate: ["gyro_v_skill3", "gyro_v2_skill3"],
};

const HP = 6;
const ARMOR = 2;
const BALLS = 2;
const MOV = 4;
const MOV_HORSE = 5;
const RANGE = [1, 4];
const RANGE_HORSE = [1, 5];
const NO_STRIKE = [1, 0];
const HORSE_HP = 3;
const HORSE_CD = 3;          // ม้าตาย = เรียกไม่ได้ 3 เทิร์น (ผู้ใช้สั่ง 2026-10-20 — เดิม 2)
const BALL_DMG = 1;          // กลับคืนเจ้าของ / วิชาลับ (ต่อขา)
const RECALL_HEAL = 1;
const RECALL_HEAL_MAX = 2;   // ต่อเทิร์น
const SECRET_GOLD = 5;
const SECRET_PULL = 4;
const SECRET_AREA = { kind: "line", len: 8, width: 1, hostile: true };
const ULT_GOLD = 20;
const ULT_CD = 3;
const BREAKER_MAX = 6;
const ROOT_TURNS = 2;
const SHOVE_DMG = 1;
const GOLDEN_MAX = 30;
// จังหวะเอฟเฟกต์ (ms) — ต้องตรงกับ GYRO_FX ใน client/src/board/gyroFx.js (GRID_PLAN §7.11)
const GYRO_FX = { throw: 650, recall: 550, secret: 1600, secretGo: 750, golden: 1400, breakerBase: 800, breakerPerTile: 110 };

const isGyro = (p) => !!p && p.characterId === ID;
function fresh() {
  return {
    balls: [],           // ลูกบนพื้น [{ x, y, seq }] — ในมือ = BALLS − จำนวนนี้
    seq: 0,              // เลขลำดับลูกของเจ้าของ (ลูกเก่าสุด = seq น้อยสุด)
    golden: 0,           // สัดส่วนทองคำ (0..30 · ตายไม่รีเซ็ต)
    mounted: true,       // เริ่มเกมขี่ม้า
    horseHp: HORSE_HP,
    horseReadyRound: 0,  // ม้าตาย: เรียกได้อีกเมื่อ roundNumber >= ค่านี้
    ultReadyRound: 0,
    empowered: false,    // เสริมตีปกติครั้งถัดไป (หมดเมื่อจบตาเดินนั้น — onActorEnd)
    empoweredSever: 0,   // ลำดับตอนได้เสริม (engine.severStamp — ฮุค severables)
    healedRound: 0,      // กลับคืนเจ้าของ: เทิร์นที่นับการฟื้น
    healed: 0,
    walkGolden: 0,       // ทองคำหลังการเดินครั้งล่าสุดของตานี้ (ประกายทองตอนได้เพิ่ม)
    pending: null,       // ตีปกติที่รอผลหลังฉาก { targetId, from, to, hit, breaker: { dir, dmg } }
    counterFx: null,     // ตีสวน: throw ที่รอส่งหลังผลักผู้ตี (afterCounterPush)
  };
}
function st(p) { return p.gyro || (p.gyro = fresh()); }
const hand = (p) => Math.max(0, BALLS - st(p).balls.length);
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const center = (pos, size) => ({ x: pos.x + (size - 1) / 2, y: pos.y + (size - 1) / 2 });
const tile = (t) => ({ x: t.x, y: t.y });
const K = Board.key;

function fx(engine, p, kind, data) {
  engine.boardFx("gyroFx", { kind, id: p.id, color: engine.colorOf(p), ...data });
}
// ดาเมจจากลูก 1 ครั้ง (เกราะก่อน · ฆ่าได้ · ไม่หลบ) — ผู้เรียกห่อ withEffectSource(เจ้าของลูก) → ดาเมจที่ลงจริง
function ballHit(engine, owner, t, n, label) {
  if (!t || !t.alive || engine.sameTeam(owner, t)) return 0;
  const before = (t.hp || 0) + (t.armor || 0);
  t.wasAttacked = true;
  engine.dealMixed(t, n, false);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  engine.log(`🟢 ${label} → ${t.name} -${dealt} (ลดเกราะก่อน)`);
  if (!t.alive) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return dealt;
}
// ช่องของเป้าที่ใกล้ไจโรที่สุด (ตัวใหญ่) — ช่องที่ลูกตก
function landTile(engine, p, t) {
  const cells = Board.footprint(t.pos.x, t.pos.y, engine.sizeOf(t));
  const c = center(p.pos, engine.sizeOf(p));
  return tile(cells.reduce((best, x) => (Math.hypot(x.x - c.x, x.y - c.y) < Math.hypot(best.x - c.x, best.y - c.y) ? x : best)));
}
// เส้นจากช่อง a ถึงช่อง b แบบแตะทุกช่อง (ทแยงผ่านมุม = ได้ทั้งสองช่องข้างมุม) — รวมปลายทั้งสอง
function touchLine(a, b) {
  const out = [{ x: a.x, y: a.y }];
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  const sx = Math.sign(b.x - a.x), sy = Math.sign(b.y - a.y);
  let x = a.x, y = a.y, ix = 0, iy = 0;
  while (ix < dx || iy < dy) {
    // เส้นข้ามขอบแนวตั้งถัดไปที่ (1 + 2ix) / 2dx · ขอบแนวนอน (1 + 2iy) / 2dy — เทียบแบบจำนวนเต็ม
    const cmp = ix >= dx ? 1 : iy >= dy ? -1 : (1 + 2 * ix) * dy - (1 + 2 * iy) * dx;
    if (cmp === 0) {
      out.push({ x: x + sx, y }, { x, y: y + sy });
      x += sx; y += sy; ix++; iy++;
    } else if (cmp < 0) { x += sx; ix++; } else { y += sy; iy++; }
    out.push({ x, y });
  }
  return out;
}
// 1 ใน 8 ทิศที่ใกล้เส้นจาก a ไป b ที่สุด
function dir8(a, b) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const oct = Math.round(ang / (Math.PI / 4));
  const a8 = oct * (Math.PI / 4);
  return { x: Math.round(Math.cos(a8)), y: Math.round(Math.sin(a8)) };
}
// ทิศผลัก 1 ช่องออกจากไจโร: แกนที่ห่างกันมากกว่า · เท่ากัน = แกนตั้งก่อนแล้วแกนนอน (แบบถอยหลังตีสวน — Board.pushback)
function pushDirs(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y, sx = Math.sign(dx), sy = Math.sign(dy);
  if (Math.abs(dx) > Math.abs(dy)) return [{ x: sx, y: 0 }];
  if (Math.abs(dy) > Math.abs(dx)) return [{ x: 0, y: sy }];
  return [{ x: 0, y: sy }, { x: sx, y: 0 }].filter((d) => d.x || d.y);
}
function root(engine, t) {
  const acted = engine.hasActed(t.id) || engine.actorId === t.id;
  if (engine.applyDebuff(t, "rooted", 1, ROOT_TURNS + (acted ? 1 : 0))) {
    engine.log(`⛓️ ${t.name} ถูกตรึง — เดินไม่ได้ ${ROOT_TURNS} เทิร์น`);
    return true;
  }
  engine.log(`⛓️ ${t.name} ต้านการตรึงไว้ได้`);
  return false;
}

// ---------- ลูกเหล็ก ----------
function dropBall(p, at) {
  const s = st(p);
  if (s.balls.length >= BALLS) return null;
  const ball = { x: at.x, y: at.y, seq: ++s.seq };
  s.balls.push(ball);
  return ball;
}
function oldestBall(p) {
  const b = st(p).balls;
  return b.length ? b.reduce((a, x) => (x.seq < a.seq ? x : a)) : null;
}

// ---------- กระเด็นถึงขอบ (การหมุนที่สมบูรณ์แบบ) ----------
// วางแผนบนสำเนาตำแหน่ง (ไม่แตะเกม) → { path, to, smashKeys, jumps, shoves: [{ id, from, to, dir }] }
//  ช่องถัดไปนอกกระดาน = หยุด · สิ่งกีดขวางพังได้ = พังแล้วผ่าน · พังไม่ได้ (ผนึกมิโกะ/ร้านค้า/ร่าง) = ลอยข้าม
//  คนขวาง = ดันออกข้างซ้าย/ขวา (ช่องว่างใกล้สุดฝั่งไหนก็ได้) · สองฝั่งไม่ว่าง = ดันนำหน้าไป (ดันต่อไม่ได้ = เป้าหยุด)
//  ช่องที่หยุดยืนไม่ได้ (ลอยข้ามจนสุดขอบ) = ถอยกลับตามทางจนถึงช่องที่ยืนได้
function planFlight(engine, t, dir) {
  const map = engine.boardMap();
  const size = engine.sizeOf(t);
  const real = engine.boardUnits();
  const units = real.filter((u) => u.id !== t.id).map((u) => ({ ...u }));
  const broken = new Set();
  const smashKeys = [], jumps = [], moved = new Map();
  const terrainAt = (x, y) => (broken.has(K(x, y)) ? null : map.terrain[K(x, y)] || null);
  // ช่องที่ห้ามยืนนอกจากสิ่งกีดขวาง (ร้านค้า / ร่างของระบบคู่) — ไม่มีสิ่งกีดขวาง ไม่มีคน แต่ tileFree บอกว่าไม่ว่าง
  const blockedAt = (x, y) => !map.terrain[K(x, y)] && !Board.unitAt(real, x, y) && !engine.tileFree(x, y);
  const unitOn = (x, y, skip) => units.find((u) => u.id !== skip && Board.covers(u, x, y)) || null;
  const standable = (x, y, s, selfId) => Board.footprint(x, y, s).every((c) => Board.inBounds(map, c.x, c.y)
    && !terrainAt(c.x, c.y) && !blockedAt(c.x, c.y) && !unitOn(c.x, c.y, selfId));
  const overlaps = (u, x, y, cells) => Board.footprint(x, y, Board.sizeOf(u)).some((c) => cells.some((d) => d.x === c.x && d.y === c.y));
  const shift = (u, to, d) => {
    const prev = moved.get(u.id);
    moved.set(u.id, { id: u.id, from: prev ? prev.from : { x: u.x, y: u.y }, to: { ...to }, dir: d });
    u.x = to.x; u.y = to.y;
  };
  const perps = [{ x: -dir.y, y: dir.x }, { x: dir.y, y: -dir.x }];
  let cur = { ...t.pos };
  const path = [];
  for (let guard = 0; guard < map.cols + map.rows; guard++) {
    const nx = cur.x + dir.x, ny = cur.y + dir.y;
    const cells = Board.footprint(nx, ny, size);
    if (cells.some((c) => !Board.inBounds(map, c.x, c.y))) break;
    let stop = false;
    for (const u of units.filter((o) => cells.some((c) => Board.covers(o, c.x, c.y)))) {
      const us = Board.sizeOf(u);
      let spot = null, sd = null;
      for (let k = 1; k <= size + us && !spot; k++) {
        for (const pd of perps) {
          const x = u.x + pd.x * k, y = u.y + pd.y * k;
          if (!overlaps(u, x, y, cells) && standable(x, y, us, u.id)) { spot = { x, y }; sd = pd; break; }
        }
      }
      if (!spot) {
        for (let k = 1; k <= size + us && !spot; k++) {
          const x = u.x + dir.x * k, y = u.y + dir.y * k;
          if (!overlaps(u, x, y, cells) && standable(x, y, us, u.id)) { spot = { x, y }; sd = dir; }
        }
      }
      if (!spot) { stop = true; break; }
      shift(u, spot, sd);
    }
    if (stop) break;
    for (const c of cells) {
      const terr = terrainAt(c.x, c.y);
      if (terr && !Board.UNBREAKABLE.has(terr)) { broken.add(K(c.x, c.y)); smashKeys.push(K(c.x, c.y)); }
      else if (terr || blockedAt(c.x, c.y)) jumps.push({ x: c.x, y: c.y });
    }
    cur = { x: nx, y: ny };
    path.push(cur);
  }
  while (path.length && !standable(path[path.length - 1].x, path[path.length - 1].y, size, t.id)) path.pop();
  const to = path.length ? { ...path[path.length - 1] } : { ...t.pos };
  return { path, to, smashKeys, jumps, shoves: [...moved.values()] };
}
const flightDamage = (plan) => Math.min(BREAKER_MAX, plan.path.length);

// ตีเสริมโดน (หลังฉากตี) → ลงผลทั้งหมด + ส่ง breaker → คืนวินาทีที่พักฉาก
function breaker(engine, p, t, pend) {
  const dir = pend.breaker.dir;
  const plan = planFlight(engine, t, dir);
  const from = { ...t.pos };
  const smashed = plan.smashKeys.length ? engine.breakObstacles(plan.smashKeys).map((b) => tile(b)) : [];
  const shoves = [];
  const slides = [];
  for (const m of plan.shoves) {
    const u = engine.players[m.id];
    if (!u || !u.alive || !u.pos) continue;
    engine.ice.revealPushed(u);
    u.pos = { ...m.to };
    shoves.push({ id: u.id, from: m.from, to: { ...m.to } });
    slides.push({ id: u.id, via: m.from, to: { ...m.to }, dir: m.dir });
    if (engine.sameTeam(p, u)) engine.log(`💨 ${u.name} ถูกดันหลบทาง`);
  }
  if (t.alive && t.pos) {
    engine.ice.revealPushed(t);
    t.pos = { ...plan.to };
  }
  const dist = plan.path.length;
  const dmg = flightDamage(plan);
  engine.log(`🌀 ${t.name} กระเด็น ${dist} ช่อง`);
  fx(engine, p, "breaker", {
    targetId: t.id, from, to: { ...plan.to }, path: plan.path.map(tile), dist, dmg,
    jumps: plan.jumps, smashed, shoves,
  });
  engine.sfx(SFX.fly);
  if (shoves.length) engine.sfx(SFX.shove);
  slides.push({ id: t.id, to: { ...plan.to }, dir, path: [from, ...plan.path.map(tile)] });
  engine.ice.forcedSlides(slides, p);
  // ผู้ใช้สั่ง 2026-10-20: ลูกแตะ → เอฟเฟกต์ก่อน → กระเด็นถึงขอบ → แล้วค่อยเสียดาเมจ (ดาเมจ/ตรึง/คนที่ถูกชน ลงตอนจบฉากกระเด็น)
  const hit = plan.shoves.filter((m) => !engine.sameTeam(p, engine.players[m.id] || {})).map((m) => m.id);
  return {
    hold: (GYRO_FX.breakerBase + GYRO_FX.breakerPerTile * dist) / 1000,
    land: () => {
      for (const id of hit) ballHit(engine, p, engine.players[id], SHOVE_DMG, `${t.name} กระเด็นชน`);
      if (dmg > 0) ballHit(engine, p, t, dmg, "การหมุนที่สมบูรณ์แบบ");
      if (t.alive && t.pos) root(engine, t);
    },
  };
}
// ตีโดน (ไม่เสริม) → ผลักเป้า 1 ช่องออกจากไจโร (ชน = ไม่ขยับ ไม่เสียเพิ่ม · ตัวใหญ่ไม่ขยับ · ลงน้ำแข็งไถลต่อ)
function knockDir(engine, from, fromSize, t) {
  const dirs = pushDirs(center(from, fromSize), center(t.pos, engine.sizeOf(t)));
  if (!dirs.length) return null;
  return dirs.find((v) => engine.tileFree(t.pos.x + v.x, t.pos.y + v.y, t.id)) || dirs[0];
}
// ช่องที่ลูกจะตก = ช่องที่เป้าจะถูกผลักไป 1 ช่อง (ผู้ใช้สั่ง 2026-10-20 — เรียกคืนแล้วโดนเป้า) · ผลักไม่ได้ = ช่องเดิม
function knockLand(engine, p, t) {
  const at = landTile(engine, p, t);
  if (engine.sizeOf(t) > 1) return at;
  const d = knockDir(engine, p.pos, engine.sizeOf(p), t);
  return d && engine.tileFree(t.pos.x + d.x, t.pos.y + d.y, t.id) ? { x: t.pos.x + d.x, y: t.pos.y + d.y } : at;
}
// ลูกที่ตกพร้อมการผลัก (ball.stick = id เป้า) → ย้ายไปช่องที่เป้าอยู่จริงหลังผลัก/ไถลจบ
function settleBall(engine, p, t) {
  const b = st(p).balls.find((x) => x.stick === t.id);
  if (!b) return null;
  delete b.stick;
  if (t.alive && t.pos) { const at = landTile(engine, p, t); b.x = at.x; b.y = at.y; }
  return b;
}
function knockOne(engine, p, t, pend) {
  if (!t.alive || !t.pos) { settleBall(engine, p, t); return; }
  const d = knockDir(engine, pend.from, engine.sizeOf(p), t);
  if (d) {
    const ctx = engine.ice.begin();
    if (engine.ice.pushUnit(t, d, ctx)) engine.log(`↩️ ${t.name} ถูกลูกเหล็กผลัก 1 ช่อง`);
    engine.ice.flush(ctx);
  }
  settleBall(engine, p, t);
}

// ---------- วิชาลับไจโร ----------
// เวลาที่ลูกผ่านระยะ d (ms) — ต้องตรงกับ secretGeo/SC ใน client/src/board/gyroFx.js
const SEC_T = { spin: 140, out: 700, hover: 880, back: 1480 };
function secretClock(engine, p, tiles, v) {
  const A = [p.pos.x + 0.5, p.pos.y + 0.5], H = 0.25;
  const along = (x, y) => (x - A[0]) * v[0] + (y - A[1]) * v[1];
  const D = tiles.length ? Math.max(1, ...tiles.map((c) => along(c.x + 0.5, c.y + 0.5))) : SECRET_AREA.len;
  const c01 = (x) => Math.max(0, Math.min(1, x));
  return {
    d: (t) => { const n = engine.sizeOf(t); return along(t.pos.x + n / 2, t.pos.y + n / 2); },
    outT: (d) => SEC_T.spin + (SEC_T.out - SEC_T.spin) * (1 - Math.pow(1 - c01((d - H) / Math.max(0.01, D - H)), 1 / 2.2)),
    backT: (d) => SEC_T.hover + (SEC_T.back - SEC_T.hover) * Math.pow(c01((D - d) / Math.max(0.01, D - H)), 1 / 1.7),
  };
}
function secret(engine, p, targets, dirKey) {
  const v = Board.LINE_DIRS[dirKey];
  const tiles = engine.areaTiles(p, SECRET_AREA, dirKey).map(tile);
  const foes = (targets || []).map((id) => engine.players[id]).filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));
  const hits = foes.map((t) => t.id);
  // ดาเมจลงทีละครั้งตามจังหวะลูก (ผู้ใช้สั่ง 2026-10-20): −1 ตอนลูกขาไปผ่าน · −1 ตอนลูกขากลับผ่าน (ช่องเดิมก่อนถูกดึง) → secretHit ขึ้นเลข
  const clock = secretClock(engine, p, tiles, v);
  const legs = [];
  for (const t of foes) {
    const d = clock.d(t), at = { ...t.pos };
    legs.push({ ms: clock.outT(d), t, at, leg: "out" }, { ms: clock.backT(d), t, at, leg: "back" });
  }
  // ดึงเข้าหาไจโร 4 ช่อง — คนใกล้ก่อน · ติดอะไรหยุดตรงนั้น · ตัวใหญ่ไม่ถูกดึง
  const back = { x: -v[0], y: -v[1] };
  const pulls = [];
  const near = (t) => Board.dist(Board.boxOf(p), Board.boxOf(t));
  for (const t of foes.filter((o) => o.alive && o.pos).sort((a, b) => near(a) - near(b))) {
    if (engine.sizeOf(t) > 1) continue;
    const from = { ...t.pos };
    let at = { ...from };
    for (let i = 0; i < SECRET_PULL; i++) {
      const nx = at.x + back.x, ny = at.y + back.y;
      if (!engine.tileFree(nx, ny, t.id)) break;
      at = { x: nx, y: ny };
    }
    if (at.x === from.x && at.y === from.y) continue;
    engine.ice.revealPushed(t);
    t.pos = at;
    pulls.push({ id: t.id, from, to: { ...at } });
    engine.log(`🌀 ${t.name} ถูกดึงเข้าหา ${p.name}`);
  }
  fx(engine, p, "secret", { from: { ...p.pos }, dir: dirKey, len: SECRET_AREA.len, tiles, hits, pulls });
  engine.sfx(SFX.throw);
  engine.sfx(SFX.spin);
  engine.sfx(SFX.secret);
  // จังหวะเรียงตามเวลา: ลูกผ่านศัตรูแต่ละคน (ขาไป/ขากลับ) + เสียงขากลับ → จบฉากแล้วไถลคนที่ถูกดึงลงน้ำแข็ง
  const beats = [...legs, { ms: GYRO_FX.secretGo, sound: true }].sort((a, b) => a.ms - b.ms);
  let now = 0;
  for (let i = 0; i < beats.length;) {
    const ms = beats[i].ms, group = [];
    while (i < beats.length && beats[i].ms - ms < 1) group.push(beats[i++]);
    engine.skillBeat(Math.max(0, ms - now) / 1000, () => {
      for (const b of group) {
        if (b.sound) { engine.sfx(SFX.secretReturn); continue; }
        if (!b.t.alive) continue; // ตายตั้งแต่ขาไป = ขากลับไม่โดน
        ballHit(engine, p, b.t, BALL_DMG, `${p.name} วิชาลับไจโร (${b.leg === "out" ? "ขาไป" : "ขากลับ"})`);
        fx(engine, p, "secretHit", { targetId: b.t.id, at: b.at, dmg: BALL_DMG, leg: b.leg });
      }
    });
    now = ms;
  }
  engine.skillBeat(Math.max(0, GYRO_FX.secret - now) / 1000, () => {
    engine.ice.forcedSlides(pulls.filter((m) => engine.players[m.id] && engine.players[m.id].alive).map((m) => ({ id: m.id, via: m.from, to: m.to, dir: back })), p);
  });
}

// ---------- กลับคืนเจ้าของ ----------
function recall(engine, p) {
  const s = st(p);
  const ball = oldestBall(p);
  if (!ball || !p.pos) return;
  s.balls = s.balls.filter((b) => b !== ball);
  const path = touchLine(ball, p.pos);
  const own = Board.footprint(p.pos.x, p.pos.y, engine.sizeOf(p));
  const cells = path.filter((c) => !own.some((o) => o.x === c.x && o.y === c.y));
  const set = new Set(cells.map((c) => K(c.x, c.y)));
  const hits = [];
  for (const t of Object.values(engine.players)) {
    if (!t.alive || !t.pos || t.id === p.id || engine.sameTeam(p, t)) continue;
    if (!Board.footprint(t.pos.x, t.pos.y, engine.sizeOf(t)).some((c) => set.has(K(c.x, c.y)))) continue;
    hits.push(t.id);
    ballHit(engine, p, t, BALL_DMG, `${p.name} กลับคืนเจ้าของ`);
  }
  if (s.healedRound !== engine.roundNumber) { s.healedRound = engine.roundNumber; s.healed = 0; }
  // เทิร์นละไม่เกิน 2 — นับเฉพาะครั้งที่ฟื้นได้จริง (เลือดเต็ม = ไม่เสียโควตา)
  if (s.healed < RECALL_HEAL_MAX) {
    const healed = engine.healHp(p, RECALL_HEAL);
    if (healed > 0) { s.healed++; engine.log(`💚 ${p.name} ลูกเหล็กกลับมือ — ฟื้นพลังชีวิต +${healed}`); }
  }
  engine.hitArea(p, [], hits); // คนในพุ่ม/ล่องหนที่โดน = โผล่ (ไม่ลงผนึก/หนามตามทาง)
  fx(engine, p, "recall", { from: tile(ball), to: { ...p.pos }, path, hits });
  engine.sfx(SFX.recall);
  engine.skillBeat(GYRO_FX.recall / 1000, () => {});
}

// ---------- สัดส่วนทองคำ ----------
// ช่วงเดินตรงที่ยาวที่สุด (จำนวนก้าวต่อเนื่องในทิศเดียวกัน) ของเส้นทาง
function longestRun(tiles) {
  const t = [];
  for (const c of tiles || []) if (!t.length || t[t.length - 1].x !== c.x || t[t.length - 1].y !== c.y) t.push(c);
  let best = 0, run = 0, last = null;
  for (let i = 1; i < t.length; i++) {
    const d = `${t[i].x - t[i - 1].x},${t[i].y - t[i - 1].y}`;
    run = d === last ? run + 1 : 1;
    last = d;
    if (run > best) best = run;
  }
  return best;
}

// ---------- ม้า ----------
function horseReady(engine, p) { return cdLeft(st(p).horseReadyRound, engine.roundNumber) === 0; }
function setMounted(engine, p, on) {
  const s = st(p);
  if (on === s.mounted) return false;
  if (on) {
    if (!horseReady(engine, p)) return false;
    if (s.horseHp <= 0) s.horseHp = HORSE_HP;
  }
  s.mounted = on;
  if (p.pos) fx(engine, p, "horse", { at: { ...p.pos }, mode: on ? "mount" : "dismount" });
  engine.log(on ? `🐎 ${p.name} ขึ้นม้าวาลคิรี` : `🐎 ${p.name} ลงจากม้า`);
  return true;
}

module.exports = {
  id: ID,
  IMG, SFX, VOICE, HP, ARMOR, BALLS, MOV, MOV_HORSE, RANGE, RANGE_HORSE, HORSE_HP, HORSE_CD, BALL_DMG, RECALL_HEAL,
  RECALL_HEAL_MAX, SECRET_GOLD, SECRET_PULL, SECRET_AREA, ULT_GOLD, ULT_CD, BREAKER_MAX, ROOT_TURNS, SHOVE_DMG, GOLDEN_MAX, GYRO_FX,
  isGyro, hand, touchLine, dir8, longestRun, planFlight,

  resetCombat(p) { p.gyro = isGyro(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },
  mov(p) { return isGyro(p) ? (st(p).mounted ? MOV_HORSE : MOV) : null; },
  // ไม่มีลูกในมือ = ไม่มีช่องที่ตีถึง (ตีสวนก็ไม่ได้) · ปืน GUTS ยังยิงได้
  range(p) {
    if (!isGyro(p)) return null;
    if (hand(p) <= 0) return NO_STRIKE;
    return st(p).mounted ? RANGE_HORSE : RANGE;
  },
  attackSound(p) { return isGyro(p) ? (st(p).empowered ? SFX.breaker : SFX.hit) : undefined; },
  voiceLines(p) { return isGyro(p) ? VOICE : null; },

  // ---------- ตีปกติ / ตีสวน ----------
  // ตีเสริม: ดาเมจ = ช่องที่จะกระเด็น (≤ 6) ไม่รับบัฟ · เสริมใช้ได้เฉพาะตาเดินของตัวเอง (ตีสวนไม่เสริม)
  //  ตีจริง = 0 ตอนปะทะ (ดาเมจลงตอนชนขอบ — breaker().land) · หน้าคาดการณ์ (estimate) = ดาเมจที่จะได้ตอนชนขอบ
  fixedStrikeDamage(engine, attacker, target, ctx) {
    if (!isGyro(attacker) || !st(attacker).empowered || engine.actorId !== attacker.id || !attacker.pos || !target || !target.pos) return null;
    if (!(ctx && ctx.estimate)) return 0;
    const dir = dir8(center(attacker.pos, engine.sizeOf(attacker)), center(target.pos, engine.sizeOf(target)));
    return flightDamage(planFlight(engine, target, dir));
  },
  deferStrikeDamage(p) { return isGyro(p) && st(p).empowered; },
  // หลังตี/ตีสวน 1 ครั้ง (เป้ายังอยู่ช่องเดิม): ใช้ลูก 1 ลูก ลูกตกช่องเป้า · ส่ง throw
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isGyro(attacker) || !attacker.pos) return;
    const s = st(attacker);
    const empowered = !counter && s.empowered;
    const hit = !(res && res.dodge);
    // ตีโดน (ไม่เสริม) = ลูกตกช่องที่เป้าถูกผลักไป · ตีสวน = รู้ช่องหลังผลัก (afterCounterPush) · หลบ/เสริม/ตาย = ช่องเป้า
    const pushes = hit && !empowered && target.alive && target.pos;
    const at = !target.pos ? null : pushes && !counter ? knockLand(engine, attacker, target) : landTile(engine, attacker, target);
    const ball = at ? dropBall(attacker, at) : null;
    if (ball && pushes) ball.stick = target.id;
    s.pending = null;
    if (!counter) {
      s.pending = { targetId: target.id, from: { ...attacker.pos }, hit };
      if (empowered) {
        const dir = dir8(center(attacker.pos, engine.sizeOf(attacker)), center(target.pos || attacker.pos, engine.sizeOf(target)));
        s.pending.breaker = { dir, dmg: (res && res.dmg) || 0 };
        s.empowered = false;
      }
    }
    const throwFx = { from: { ...attacker.pos }, to: target.pos ? { ...target.pos } : at, land: at, hit, counter: !!counter, empowered };
    if (counter && ball && ball.stick) { s.counterFx = throwFx; return; } // ส่งหลังผลัก (afterCounterPush) — land = ช่องหลังผลัก
    fx(engine, attacker, "throw", throwFx);
    engine.sfx(SFX.throw);
    engine.sfx(SFX.spin);
  },
  // ไจโรตีสวนแล้วผู้ตีถูกผลัก (หรือไม่ขยับ) → ลูกไปตกช่องที่ผู้ตีอยู่ · ส่ง throw
  afterCounterPush(engine, counterer, attacker) {
    if (!isGyro(counterer)) return;
    const s = st(counterer);
    const b = settleBall(engine, counterer, attacker);
    const f = s.counterFx;
    s.counterFx = null;
    if (!f) return;
    if (b) f.land = tile(b);
    fx(engine, counterer, "throw", f);
    engine.sfx(SFX.throw);
    engine.sfx(SFX.spin);
  },
  // ไจโรตีสวน: ลูกผลักผู้ตี 1 ช่อง แทนการถอยปกติ (ตีสวนพลาด = ไม่ผลัก · ชน = ไม่เสียเพิ่ม)
  counterPush(engine, counterer, attacker, res) {
    if (!isGyro(counterer)) return null;
    return { push: !(res && res.dodge) };
  },
  afterBoardAttack(engine, attacker, target, res) {
    if (!isGyro(attacker)) return null;
    const pend = st(attacker).pending;
    st(attacker).pending = null;
    if (!pend || pend.targetId !== target.id || !pend.hit || !res || res.dodge) { settleBall(engine, attacker, target); return null; }
    if (pend.breaker) return () => (target.alive && target.pos ? breaker(engine, attacker, target, pend) : 0);
    return () => { knockOne(engine, attacker, target, pend); };
  },
  // ตีผนึกมิโกะ / หนามน้ำแข็ง: ใช้ลูกเหมือนตีคน (ลูกตกช่องนั้น) · ตีเสริมใส่ของ = เสริมหมดไปเฉยๆ
  onStrikeObject(engine, p, at) {
    if (!isGyro(p) || !p.pos) return;
    const s = st(p);
    const empowered = s.empowered;
    s.empowered = false;
    dropBall(p, at);
    fx(engine, p, "throw", { from: { ...p.pos }, to: { ...at }, land: { ...at }, hit: true, counter: false, empowered });
    engine.sfx(SFX.throw);
    engine.sfx(SFX.spin);
  },

  // ---------- ม้า: ชั้นเลือดรับดาเมจก่อนเกราะ ----------
  absorbDamage(engine, p) {
    if (!isGyro(p)) return false;
    const s = st(p);
    if (!s.mounted || s.horseHp <= 0) return false;
    s.horseHp--;
    if (s.horseHp <= 0) {
      s.mounted = false;
      s.horseReadyRound = engine.roundNumber + HORSE_CD;
      if (p.pos) fx(engine, p, "horse", { at: { ...p.pos }, mode: "die" });
      engine.log(`🐎 ม้าวาลคิรีของ ${p.name} ล้ม — เรียกไม่ได้ ${HORSE_CD} เทิร์น`);
    }
    return true;
  },
  hudActions(engine, p) {
    if (!isGyro(p) || !p.alive) return undefined;
    const s = st(p);
    const cd = s.mounted ? 0 : cdLeft(s.horseReadyRound, engine.roundNumber);
    return [{ key: "horse", icon: "🐎", name: s.mounted ? "ลงม้า" : "ขึ้นม้า", on: s.mounted, cd, disabled: !engine.canAct(p) || cd > 0 }];
  },
  // ปุ่มขึ้น/ลงม้า: ตาเดินของตัวเอง · 0 แต้ม · ไม่นับเป็นการใช้สกิล · ไม่ล็อกการเดิน (ระยะเดิน/ตีปรับทันที)
  charAction(engine, p, key) {
    if (!isGyro(p) || key !== "horse" || !engine.canAct(p)) return false;
    const ok = setMounted(engine, p, !st(p).mounted);
    if (ok) engine.broadcastState();
    return ok;
  },

  // ---------- สกิล ----------
  canUseSkill(engine, p, tier) {
    if (!isGyro(p)) return true;
    const s = st(p);
    if (tier === "basic") return s.balls.length > 0 && !!p.pos;
    if (tier === "secondary") return hand(p) >= 1 && s.golden >= SECRET_GOLD;
    if (tier === "ultimate") return hand(p) >= BALLS && s.mounted && s.golden >= ULT_GOLD && cdLeft(s.ultReadyRound, engine.roundNumber) === 0 && !s.empowered;
    return false;
  },
  // กลับคืนเจ้าของ: ไม่กินโควตา · กดได้แม้ใช้โควตาแล้ว · ไม่ล็อกการเดิน
  skipsTurnQuota(p, tier) { return isGyro(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isGyro(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isGyro(p) && tier === "basic"; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isGyro(p)) return "";
    const s = st(p);
    if (tier === "basic") { recall(engine, p); return ""; }
    if (tier === "secondary") {
      if (!opts.dir || !p.pos) return "";
      s.golden = Math.max(0, s.golden - SECRET_GOLD);
      engine.log(`🌀 ${p.name} วิชาลับไจโร (สัดส่วนทองคำ −${SECRET_GOLD})`);
      secret(engine, p, targets, opts.dir);
      return "";
    }
    if (tier === "ultimate") {
      s.golden = Math.max(0, s.golden - ULT_GOLD);
      s.empowered = true;
      s.empoweredSever = engine.severStamp();
      s.ultReadyRound = engine.roundNumber + ULT_CD;
      engine.log(`✨ ${p.name} การหมุนที่สมบูรณ์แบบ — ตีปกติครั้งถัดไปเสริมพลัง (สัดส่วนทองคำ −${ULT_GOLD})`);
      if (p.pos) fx(engine, p, "golden", { at: { ...p.pos } });
      engine.sfx(SFX.goldenCharge);
      engine.skillBeat(GYRO_FX.golden / 1000, () => {});
      return "";
    }
    return "";
  },
  skillLocks(engine, p) {
    if (!isGyro(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const ultCd = cdLeft(s.ultReadyRound, r);
    return {
      basic: { cd: 0, locked: s.balls.length === 0, free: true }, // free = กดได้แม้ใช้โควตาเทิร์นแล้ว
      secondary: { cd: 0, locked: hand(p) < 1 || s.golden < SECRET_GOLD },
      ultimate: { cd: ultCd, locked: hand(p) < BALLS || !s.mounted || s.golden < ULT_GOLD || s.empowered },
    };
  },

  // ---------- การหมุนทองคำ: ขี่ม้าเดิน = ช่วงเดินตรงยาวสุดของตา (ถูกเรียกใหม่ทุกครั้งด้วยเส้นทางเต็มจากจุดเริ่มตา) ----------
  afterWalk(engine, p, tiles) {
    if (!isGyro(p) || !st(p).mounted) return [];
    const s = st(p);
    const prev = s.golden;
    const run = longestRun(tiles);
    s.golden = Math.min(GOLDEN_MAX, prev + run);
    if (s.golden > s.walkGolden && p.pos) {
      fx(engine, p, "goldenTick", { at: { ...p.pos }, gain: s.golden - s.walkGolden });
      engine.sfx(SFX.goldenTick);
    }
    s.walkGolden = s.golden;
    return [{ undo: () => { s.golden = prev; } }];
  },
  onActorStart(engine, p) {
    if (!isGyro(p)) return;
    st(p).walkGolden = st(p).golden;
  },
  onActorEnd(engine, p) {
    if (!isGyro(p)) return;
    const s = st(p);
    s.pending = null;
    if (s.empowered) {
      s.empowered = false;
      engine.log(`✨ การหมุนที่สมบูรณ์แบบของ ${p.name} หมดลง`);
    }
  },
  // ---------- ผลสกิลที่ตัดได้ (server/sever.js — รากฐานจิตของเรียวกิ) ----------
  //  การหมุนที่สมบูรณ์แบบที่เสริมตีปกติค้างอยู่ (มีแค่ในตาเดินของไจโรเอง) → หมดแบบจบตาโดยไม่ตี (คูลดาวน์นับจากตอนกดอยู่แล้ว)
  //  ม้าวาลคิรี/ลูกเหล็ก/สัดส่วนทองคำ = ติดตัว ไม่ใช่ผลสกิล
  severables(engine, p) {
    if (!isGyro(p) || !p.alive || !st(p).empowered) return [];
    const s = st(p);
    return [{
      key: "empowered", label: "การหมุนที่สมบูรณ์แบบ", at: s.empoweredSever,
      cancel: () => {
        s.empowered = false;
        engine.log(`✨ การหมุนที่สมบูรณ์แบบของ ${p.name} หมดลง`);
      },
    }];
  },

  // ---------- เปลี่ยนแผนที่ / ตาย ----------
  // เปลี่ยนภูมิภาค = ลูกทุกลูกกลับมือ (ไม่ฟื้น ไม่มีดาเมจ)
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) if (isGyro(p) && p.gyro) p.gyro.balls = [];
  },
  // ไจโรตาย = ลูกบนพื้นของคนนั้นหายหมด (ฟื้นจากตาย = มีลูก 2 ลูกในมือ) · เสริมหมด
  onDeath(engine, p) {
    if (!isGyro(p) || !p.gyro) return;
    p.gyro.balls = [];
    p.gyro.empowered = false;
    p.gyro.pending = null;
  },

  // ---------- ข้อมูลให้ client (GRID_PLAN §7.11 สัญญาข้อมูล — ทุกคนเห็น) ----------
  gyroState(engine, p) {
    if (!isGyro(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      balls: s.balls.map((b) => ({ x: b.x, y: b.y, seq: b.seq })),
      hand: hand(p),
      golden: s.golden,
      mounted: s.mounted,
      horseHp: s.horseHp,
      horseCd: s.mounted ? 0 : cdLeft(s.horseReadyRound, r),
      empowered: s.empowered,
      ultCd: cdLeft(s.ultReadyRound, r),
    };
  },
};

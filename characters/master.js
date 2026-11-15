// ============================================================
//  Master — บอส 2 เฟส (World Tower Defense · สเปกจากเพื่อนผู้ใช้ · GRID_PLAN §7.34 · ผู้ใช้ตัดสิน 2026-11-15)
//
//  ค่าพลัง: พลังชีวิต 100 · เกราะ 0 · พลังโจมตี 3 · ตัว 2×2 · เดิน 9 · ไม่มีแต้มสกิล (ทุกสกิลไม่ใช้แต้ม มีคูลดาวน์)
//  ตีปกติ: กวาดหน้าตัว กว้าง 4 ลึก 1 (strikeRect [1, 3] บนตัว 2×2) · หลังฟื้นตีได้ 2 ครั้งต่อตา
//  Delay Arrival: เทิร์น 1–2 ไม่อยู่บนกระดาน · ต้นเทิร์น 3 ลงจากฟ้าที่จุดเกิดแบบสุ่ม → คลื่นกระแทกผลักทุกคนทั้งสนามออก 1 ช่อง (ไม่มีดาเมจ)
//  Card Restriction: ไม่จั่วไพ่ · เดินท้ายสุดเสมอ (orderLast)
//  Zombification/Holy Interval:
//   เฟส 1 (Zombie): ตี/สกิลที่โดน = พิษร้าย +1 เทิร์น (สูงสุด 3) + ธาตุพิษ (สกิลที่มีธาตุเองคงธาตุเดิม)
//   ทุก 5 เทิร์นนับจากเทิร์นที่ลง = อัญเชิญ Undead 2 + Raider 1 (เฟส 2: Blessed 2 + Holy Crusader 1) · บนสนามไม่เกิน 10 ตัว
//   ดาเมจถึงตาย (เฟส 1) → เลือด 1 + สตั้นเทิร์นนั้น · ระหว่างรอตายไม่ได้ทุกกรณี · ต้นเทิร์นหน้าฟื้น 25 + คลื่นกระแทก → เฟส 2 (Holy)
//   เฟส 2: ตี/สกิลที่โดน = อ่อนแอ +1 Lv (สูงสุด Lv2 · 3 เทิร์น) + ธาตุแสง · ฟื้นได้ครั้งเดียว
//  A fking boss!!: คนอื่นฮีลให้ไม่ได้ · เลือก Master แล้วตัวหมวด Boss ตัวอื่นเลือกไม่ได้ (server/socket.js + view.takenUniqueChars)
//  Otherly Worlder: Echo สวมไม่ได้ (characters/echo.js BLOCKED — ผู้ใช้อนุญาต)
//  Twin Sword Slam (พื้นฐาน · คูลดาวน์ 2): คลื่น 3 แฉก (ตรงกว้างเท่าตัวยาว 3 · เฉียงแฉกละ 2) ดาเมจ 3
//   หลังฟื้น: กดได้ 2 ครั้งก่อนคูลดาวน์ · ติดเปราะบาง +1 Lv (Lv2 · 3 เทิร์น) · ครั้งที่ 3, 6, 9 … = ตรง 4 เฉียง 3 + สตั้น 2 เทิร์น
//  Knockdown Slash (รอง · คูลดาวน์ 3): แนวกว้างเท่าตัว ยาว 4 · ดาเมจ 4 · ผลักถอย 1 · ลม → หลังฟื้น ยาว 6 คลื่นซ้ำ 2 ครั้ง · แสง
//  Smite (ท่าไม้ตาย · คูลดาวน์ 3): ฟ้าผ่าศัตรูทุกคน ดาเมจ 2 + ช็อต 3 เทิร์น · สายฟ้า → หลังฟื้น ผ่า 2 ครั้ง · มืด · หลบได้ทีละสาย
//  ทุกสกิลโดนทุกศัตรูในพื้นที่ · หลบได้ (skillStrike) · 1 สกิลต่อตา (หลังฟื้น 2)
// ============================================================
const Board = require("../server/board");
const Element = () => require("../server/element"); // require ตอนเรียก — element.js อ่าน CHAR_HOOKS ตอนโหลด (ห้ามโหลดระหว่าง characters/index)
const Status = require("./_universal_status");

const ID = "master";
const DIR = "/characters/master";
const IMG = {
  p1: `${DIR}/master.webp`, p2: `${DIR}/master2.webp`,
  slam: `${DIR}/twin_sword_slam.webp`, knock: `${DIR}/knockdown_slash.webp`, smite: `${DIR}/smite.webp`,
  undead: `${DIR}/undead.webp`, raider: `${DIR}/raider.webp`, blessed: `${DIR}/blessed.webp`, crusader: `${DIR}/holy_crusader.webp`,
};
const SFX = {
  melee: "master_melee", slam: "master_wave", slash: "master_slash", thunder: "master_thunder",
  shock: "master_shockwave", revive: "master_revive", roar: "master_roar", death: "master_death", raider: "master_raider",
};
const MUSIC = { p1: "master_phase1", p2: "master_phase2" }; // คีย์เสียงใน client/src/audio.js

const HP = 100, ATK = 3, SIZE = 2, MOV = 9;
const LAND_ROUND = 3;
const REVIVE_HEAL = 25;
const SUMMON_EVERY = 5, SUMMON_CAP = 10;
const CD = { basic: 2, secondary: 3, ultimate: 3 };
// จุดระเบิดหนามกรอบ 3×3: ตรง 3 กรอบ · เฉียงขึ้น/ลงข้างละ 2 (ภาพของเพื่อนผู้ใช้ 2026-11-15) · ครั้งที่ 3 ใหญ่ขึ้น: ตรง 4 · เฉียง 3 (Claude ตัดสิน)
const SLAM = { dmg: 3, boxes: [99, 99, 3], bigBoxes: [99, 99, 5], stun: 2, uses2: 2 }; // ทุกครั้งยาวสุดแผนที่ · ครั้งที่ 3 กรอบ 5×5 (ผู้ใช้ 2026-11-16)
const KNOCK = { dmg: 4, len: 99, pad: 1, pad2: 1, push: 1 }; // ยาวสุดแผนที่ · กว้าง 4 ทั้งสองเฟส (ตัว 2 + ข้างละ 1 — ผู้ใช้ 2026-11-15 แทนสเปก 4x16/6x16)
const SMITE = { dmg: 2, shock: 3 };
const POISON_MAX = 3, LV_MAX = 2, LV_TURNS = 3;
// เวลาเอฟเฟกต์บนกระดาน (วินาที — masterFx.js)
const T = { slam: 1.25, knock: 1.0, knock2: 0.85, smite: 1.5, smite2: 1.1, land: 2.4, revive: 3.2, summon: 1.6 };

const SUMMONS = {
  undead: { name: "Undead", img: IMG.undead, hp: 5, mov: 3, range: [1, 1], utype: "zombie", el: "poison", revive: true },
  raider: { name: "Raider", img: IMG.raider, hp: 3, mov: 2, range: [1, 4], box: 2, utype: "metal", el: null, sound: SFX.raider },
  blessed: { name: "Blessed", img: IMG.blessed, hp: 5, mov: 3, range: [1, 1], utype: "holy", el: "light", curse: "weak" },
  crusader: { name: "Holy Crusader", img: IMG.crusader, hp: 3, mov: 2, range: [1, 4], box: 2, utype: "holy", el: "light", curse: "slow", sound: SFX.raider },
};
const WAVE = { 1: ["undead", "undead", "raider"], 2: ["blessed", "blessed", "crusader"] };

const isMe = (p) => !!(p && p.characterId === ID && !p.summon);
const st = (p) => p.master || (p.master = fresh());
function fresh() {
  return {
    phase: 1, landed: false, spawnAt: null, landRound: null,
    down: null, revived: false,
    ready: { basic: 0, secondary: 0, ultimate: 0 },
    slamUses: 0, slamPress: 0, // หลังฟื้น: กดในรอบคูลดาวน์นี้ / กดสะสมทั้งหมด (ครั้งที่ 3, 6, 9 … = ท่าใหญ่)
    pressRound: 0, presses: 0, // กดสกิลในเทิร์นนี้ (หลังฟื้นได้ 2)
    extraUsed: false, nextSummon: null, sever: 0,
  };
}
const round = (engine) => engine.roundNumber || 0;
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const phase2 = (p) => isMe(p) && st(p).phase === 2;
const passiveOn = (p) => require("../server/passiveSeal").on(p); // on = สกิลติดตัวทำงาน (ไม่ถูกลบสกิลติดตัว)

function fx(engine, p, kind, extra = {}) {
  engine.boardFx("masterFx", { kind, id: p.id, at: p.pos ? { ...p.pos } : null, size: engine.sizeOf(p), phase: st(p).phase, ...extra });
}

// ---------- ผลติดตัวของการโจมตี (Passive 3) ----------
function curseHit(engine, p, t) {
  if (!t || !t.alive || !t.pos || engine.sameTeam(p, t) || !passiveOn(p)) return;
  if (st(p).phase === 1) addPoison(t);
  else stackLv(engine, t, "weak");
}
function addPoison(t) {
  const cur = (t.statuses && t.statuses.poison) || 0;
  return Status.applyPoison(t, Math.min(POISON_MAX, cur + 1));
}
// ซ้อนทีละ Lv (amount) สูงสุด LV_MAX และเทิร์นสูงสุด LV_TURNS (อ่อนแอ / เปราะบาง / เชื่องช้า)
function stackLv(engine, t, key) {
  const lv = Math.min(LV_MAX, ((t.statusAmt && t.statusAmt[key]) || 0) + 1);
  const turns = Math.min(LV_TURNS, ((t.statuses && t.statuses[key]) || 0) + 1);
  return engine.applyDebuff(t, key, lv, turns);
}

// ---------- คลื่นกระแทก: ผลักทุกคนทั้งสนามออกห่างจาก Master 1 ช่อง (ไม่มีดาเมจ) ----------
function shockwave(engine, p) {
  if (!p.pos) return;
  const s = engine.sizeOf(p), cx = p.pos.x + (s - 1) / 2, cy = p.pos.y + (s - 1) / 2;
  const ctx = engine.ice.begin();
  const units = Object.values(engine.players).filter((u) => u.alive && u.pos && u.id !== p.id && !(u.summon && u.summon.ownerId === p.id));
  // ไกลก่อน (คนนอกขยับออกก่อน · คนในมีที่ให้ถอย)
  const far = (u) => Math.abs(u.pos.x - cx) + Math.abs(u.pos.y - cy);
  units.sort((a, b) => far(b) - far(a));
  for (const u of units) {
    const us = engine.sizeOf(u);
    let dx = u.pos.x + (us - 1) / 2 - cx;
    const W = Board.wrapCols ? Board.wrapCols() : 0;
    if (W) { dx = ((dx % W) + W) % W; if (dx > W / 2) dx -= W; }
    const dy = u.pos.y + (us - 1) / 2 - cy;
    const sx = Math.sign(Math.round(dx * 2)), sy = Math.sign(Math.round(dy * 2));
    // ทางออกห่าง: แกนหลัก → อีกแกน → ทแยง (ชนขอบ/ของ = ลองทางถัดไป · ไม่มีทาง = ชนเฉยๆ)
    const tries = Math.abs(dx) >= Math.abs(dy)
      ? [{ x: sx || 1, y: 0 }, { x: 0, y: sy || 1 }, { x: 0, y: -(sy || 1) }, { x: sx || 1, y: sy }]
      : [{ x: 0, y: sy || 1 }, { x: sx || 1, y: 0 }, { x: -(sx || 1), y: 0 }, { x: sx, y: sy || 1 }];
    const ok = tries.find((d) => (d.x || d.y) && engine.tileFree(u.pos.x + d.x, u.pos.y + d.y, u.id));
    engine.ice.pushUnit(u, ok || tries[0], ctx, 1);
  }
  engine.ice.flush(ctx);
}

// ---------- ลงจากฟ้า ----------
function freeBox(engine, p, x, y) {
  const map = engine.boardMap();
  for (const c of Board.footprint(x, y, SIZE)) {
    if (!Board.inBounds || !Board.inBounds(map, c.x, c.y)) return false;
    if (!engine.tileFree(c.x, c.y, p.id)) return false;
  }
  return true;
}
function landingSpot(engine, p) {
  const map = engine.boardMap();
  const cols = map.cols || (map.terrain && map.terrain[0] ? map.terrain[0].length : 16);
  const rows = map.rows || (map.terrain ? map.terrain.length : 16);
  const spawns = (map.spawns || []).map((s) => ({ x: s.x, y: s.y }));
  const pool = [...spawns];
  if (st(p).spawnAt) pool.push(st(p).spawnAt);
  // สุ่มจุดเกิด · ไม่ว่าง = หาช่อง 2×2 ว่างใกล้สุด
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  for (const s of pool) {
    for (let r = 0; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = s.x + dx, y = s.y + dy;
        if (x < 0 || y < 0 || x + SIZE > cols || y + SIZE > rows) continue;
        if (freeBox(engine, p, x, y)) return { x, y };
      }
    }
  }
  for (let y = 0; y + SIZE <= rows; y++) for (let x = 0; x + SIZE <= cols; x++) if (freeBox(engine, p, x, y)) return { x, y };
  return null;
}
function land(engine, p) {
  const s = st(p);
  const at = landingSpot(engine, p);
  if (!at) return false;
  p.boardSize = SIZE;
  p.pos = { ...at };
  s.landed = true;
  s.landRound = round(engine);
  s.nextSummon = s.landRound + SUMMON_EVERY;
  engine.log(`☄️ ${p.name} ลงมาจากท้องฟ้า! คลื่นกระแทกผลักทุกคนออกห่าง`);
  fx(engine, p, "land", { secs: T.land }); // เสียง (ดาวตก → คลื่นกระแทกตอนกระแทก) client เล่นตามจังหวะ (useCharSocketFx)
  engine.withEffectSource(p, () => shockwave(engine, p));
  return true;
}

// ---------- ฟื้น (เฟส 1 → 2) ----------
function revive(engine, p) {
  const s = st(p);
  s.down = null;
  s.revived = true;
  s.phase = 2;
  s.slamUses = 0;
  s.slamPress = 0;
  // ฟื้น 25 ตรงๆ ไม่ผ่านท่อฮีล — ไม่สนไร้ทางเยียวยา / เลือดไหล / ผกผัน (ผู้ใช้ 2026-11-15)
  p.hp = Math.min(engine.maxHpOf ? engine.maxHpOf(p) : HP, (p.hp || 0) + REVIVE_HEAL);
  engine.log(`👼 ${p.name} ฟื้นคืนชีพ! พลังชีวิต +${REVIVE_HEAL} — กลายเป็น Holy`);
  fx(engine, p, "revive", { secs: T.revive });
  engine.sfx(SFX.revive); // + ประสานเสียง/คลื่นกระแทกตามจังหวะฝั่ง client
  engine.withEffectSource(p, () => shockwave(engine, p));
}

// ---------- อัญเชิญ ----------
function summonWave(engine, p) {
  const s = st(p);
  const live = engine.summon.ofOwner(p.id).filter((u) => u.summon && u.summon.masterKind);
  const room = Math.max(0, SUMMON_CAP - live.length);
  const kinds = WAVE[s.phase].slice(0, room);
  if (!kinds.length || !p.pos) return [];
  const made = [];
  for (const k of kinds) {
    const d = SUMMONS[k];
    const pos = nearFree(engine, p);
    if (!pos) break;
    const u = engine.summon.spawn(p, {
      kind: `master_${k}`, characterId: "master_summon", name: d.name, img: d.img, hp: d.hp, armor: 0,
      mov: d.mov, range: d.range, pos, data: { ai: true, masterKind: k, utype: d.utype, keepOnMap: true }, // keepOnMap = ตามไปแผนที่ใหม่
    });
    u.summon.side = p.duoOf || p.id;
    u.teamId = p.teamId || null;
    made.push(u);
  }
  if (made.length) {
    engine.log(`📯 ${p.name} อัญเชิญ ${made.map((u) => u.name).join(", ")}`);
    fx(engine, p, "summon", { ids: made.map((u) => u.id), units: made.map((u) => ({ id: u.id, at: { ...u.pos }, kind: u.summon.masterKind })), secs: T.summon });
    engine.sfx(SFX.roar);
  }
  return made;
}
// ช่องว่าง 1×1 ใกล้ตัว Master (ไล่วงออกไป)
function nearFree(engine, p) {
  const s = engine.sizeOf(p);
  for (let r = 1; r <= 6; r++) {
    const cand = [];
    for (let y = p.pos.y - r; y <= p.pos.y + s - 1 + r; y++) for (let x = p.pos.x - r; x <= p.pos.x + s - 1 + r; x++) {
      const dx = Math.max(0, p.pos.x - x, x - (p.pos.x + s - 1)), dy = Math.max(0, p.pos.y - y, y - (p.pos.y + s - 1));
      if (Math.max(dx, dy) !== r) continue;
      if (engine.tileFree(x, y, null)) cand.push({ x, y });
    }
    if (cand.length) return cand[Math.floor(Math.random() * cand.length)];
  }
  return null;
}

function freeNearSpawn(engine) {
  const map = engine.boardMap();
  const spawns = [...(map.spawns || [])];
  for (let i = spawns.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spawns[i], spawns[j]] = [spawns[j], spawns[i]]; }
  for (const sp of spawns) {
    for (let r = 0; r <= 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (engine.tileFree(sp.x + dx, sp.y + dy, null)) return { x: sp.x + dx, y: sp.y + dy };
    }
  }
  return null;
}

// ---------- ศัตรูในพื้นที่ ----------
function foesOn(engine, p, tiles) {
  const set = new Set(tiles.map((t) => `${t.x},${t.y}`));
  return Object.values(engine.players).filter((t) => t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t) && engine.dim.same(p, t) &&
    Board.footprint(t.pos.x, t.pos.y, engine.sizeOf(t)).some((c) => set.has(`${c.x},${c.y}`)));
}
function slamArea(p) {
  const s = st(p);
  const big = s.phase === 2 && (s.slamPress + 1) % 3 === 0;
  const boxes = big ? SLAM.bigBoxes : SLAM.boxes;
  return { kind: "line", len: 99, boxes, hostile: true, big };
}
function knockArea(p) { return { kind: "line", len: KNOCK.len, fan: 0, pad: phase2(p) ? KNOCK.pad2 : KNOCK.pad, hostile: true }; }

// ---------- สกิล ----------
function castSlam(engine, p, dir) {
  const s = st(p), r = round(engine);
  const area = slamArea(p);
  const tiles = Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, area.len, 1, engine.sizeOf(p), 0, false, -1, 0, area.boxes);
  const foes = foesOn(engine, p, tiles);
  if (s.phase === 2) {
    s.slamPress++;
    s.slamUses++;
    if (s.slamUses >= SLAM.uses2) { s.slamUses = 0; s.ready.basic = r + CD.basic; }
  } else s.ready.basic = r + CD.basic;
  engine.log(`⚔️ ${p.name} Twin Sword Slam${area.big ? " (คลื่นใหญ่)" : ""}`);
  fx(engine, p, "slam", { dir, tiles, big: area.big, secs: T.slam }); // เสียง (ฟาดดาบ → กระแทกพื้น + คลื่น) client เล่นตามจังหวะ
  engine.skillBeat(T.slam, () => {
    if (!p.alive || !p.pos) return;
    const hits = [];
    engine.withEffectSource(p, () => {
      for (const t of foes) {
        if (!t.alive || !t.pos) continue;
        const res = engine.skillStrike(p, t, "Twin Sword Slam", { bonus: SLAM.dmg - ATK });
        if (res && !res.dodge && !res.blocked) {
          curseHit(engine, p, t);
          if (t.alive && s.phase === 2) stackLv(engine, t, "fragile");
          if (t.alive && area.big) engine.applyDebuff(t, "stun", 1, SLAM.stun + (engine.hasActed(t.id) ? 1 : 0));
        }
        hits.push({ id: t.id, dmg: res ? res.dmg : 0, dodge: !!(res && res.dodge) });
      }
    });
    fx(engine, p, "slamHit", { hits });
  });
  return area.big ? " · คลื่นใหญ่" : "";
}
function castKnock(engine, p, dir) {
  const s = st(p), r = round(engine);
  s.ready.secondary = r + CD.secondary;
  const area = knockArea(p);
  const tiles = Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, area.len, 1, engine.sizeOf(p), 0, false, 0, area.pad);
  const waves = s.phase === 2 ? 2 : 1;
  const v = Board.LINE_DIRS[dir];
  engine.log(`🗡️ ${p.name} Knockdown Slash${waves > 1 ? " ×2" : ""}`);
  engine.sfx(SFX.slash);
  const wave = (i) => {
    fx(engine, p, "knock", { dir, tiles, wave: i, secs: i ? T.knock2 : T.knock });
    engine.skillBeat(i ? T.knock2 : T.knock, () => {
      if (!p.alive || !p.pos) return;
      const now = foesOn(engine, p, Board.lineTiles(engine.boardMap(), p.pos.x, p.pos.y, dir, area.len, 1, engine.sizeOf(p), 0, false, 0, area.pad));
      const hits = [];
      const pushed = [];
      engine.withEffectSource(p, () => {
        for (const t of now) {
          if (!t.alive || !t.pos) continue;
          const res = engine.skillStrike(p, t, "Knockdown Slash", { bonus: KNOCK.dmg - ATK });
          if (res && !res.dodge && !res.blocked) { curseHit(engine, p, t); if (t.alive && t.pos) pushed.push(t); }
          hits.push({ id: t.id, dmg: res ? res.dmg : 0, dodge: !!(res && res.dodge) });
        }
        if (pushed.length && v) {
          const ctx = engine.ice.begin();
          for (const t of pushed) engine.ice.pushUnit(t, { x: v[0], y: v[1] }, ctx, KNOCK.push);
          engine.ice.flush(ctx);
        }
      });
      fx(engine, p, "knockHit", { hits, wave: i });
      if (i + 1 < waves && p.alive) { engine.sfx(SFX.slash); wave(i + 1); }
    });
  };
  wave(0);
  return waves > 1 ? " ×2" : "";
}
function castSmite(engine, p) {
  const s = st(p), r = round(engine);
  s.ready.ultimate = r + CD.ultimate;
  const bolts = s.phase === 2 ? 2 : 1;
  engine.log(`🌩️ ${p.name} Smite${bolts > 1 ? " ×2" : ""}`);
  const strike = (i) => {
    const foes = Object.values(engine.players).filter((t) => t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t) && engine.dim.same(p, t));
    fx(engine, p, "smite", { ids: foes.map((t) => t.id), bolt: i, dark: s.phase === 2, secs: i ? T.smite2 : T.smite });
    engine.sfx(SFX.thunder);
    engine.skillBeat(i ? T.smite2 : T.smite, () => {
      if (!p.alive) return;
      const hits = [];
      engine.withEffectSource(p, () => {
        for (const t of foes) {
          if (!t.alive || !t.pos) continue;
          const res = engine.skillStrike(p, t, "Smite", { bonus: SMITE.dmg - ATK });
          if (res && !res.dodge && !res.blocked) {
            curseHit(engine, p, t);
            if (t.alive) engine.applyShock(t, SMITE.shock);
          }
          hits.push({ id: t.id, dmg: res ? res.dmg : 0, dodge: !!(res && res.dodge) });
        }
      });
      fx(engine, p, "smiteHit", { hits, bolt: i });
      if (i + 1 < bolts && p.alive) strike(i + 1);
    });
  };
  strike(0);
  return bolts > 1 ? " ×2" : "";
}

module.exports = {
  id: ID,
  IMG, SFX, SUMMONS, CD, SLAM, KNOCK, SMITE, HP, MUSIC,

  resetCombat(p) {
    if (!isMe(p)) return;
    p.master = fresh();
    p.boardSize = SIZE;
  },
  unitType(p) { return isMe(p) ? (st(p).phase === 2 ? "holy" : "zombie") : null; },
  maxHp(p) { return isMe(p) ? HP : null; },
  maxArmor(p) { return isMe(p) ? 0 : null; },
  attackBaseOverride(engine, p) { return isMe(p) ? ATK : 1; },
  mov(p) { return MOV; },
  // ไม่จั่วไพ่ · เดินท้ายสุดเสมอ
  noCards(p) { return isMe(p); },
  orderLast(p) { return isMe(p); },
  noMobFair(p) { return isMe(p); }, // Eos: ไม่ติดกติกากันรุมของช่วงมอน (server/fodlan/eosMobTurn.js)

  // ---------- ลงจากฟ้า: ซ่อนตัวตั้งแต่วางกระดาน ----------
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.alive) continue;
      const s = st(p);
      if (s.landed) { p.boardSize = SIZE; continue; }
      if (p.pos) s.spawnAt = { ...p.pos };
      p.pos = null;
    }
    // ตัวอัญเชิญที่รอดตามมาแผนที่ใหม่ (Summon.removeAll keepOnMap): เกิดรอบตัว Master · Master ไม่อยู่บนกระดาน (ยังไม่ลง/ตาย) = รอบจุดเกิดแบบสุ่ม · ไม่มีที่ = หาย
    for (const u of Object.values(engine.players)) {
      if (!u.summon || !u.summon.masterKind || !u.alive || u.pos) continue;
      const owner = engine.players[u.summon.ownerId];
      const spot = owner && owner.pos ? nearFree(engine, owner) : freeNearSpawn(engine);
      if (spot) u.pos = spot; else engine.summon.remove(u);
    }
  },
  onRoundDealt(engine) {
    const r = round(engine);
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.alive) continue;
      const s = st(p);
      if (!s.landed && r >= LAND_ROUND) land(engine, p);
      else if (s.down != null && r > s.down) revive(engine, p);
      else if (s.landed && p.pos && s.nextSummon != null && r >= s.nextSummon && passiveOn(p)) {
        s.nextSummon = r + SUMMON_EVERY;
        summonWave(engine, p);
      }
    }
  },
  onRoundStartTick(engine, p) {
    // Undead: ฟื้นพลังชีวิต 1 ต้นเทิร์นถัดจากที่ล้ม
    if (p && p.summon && p.summon.masterKind === "undead" && p.summon.down != null && round(engine) > p.summon.down) {
      p.summon.down = null;
      engine.healHp(p, 1);
      engine.log(`🧟 ${p.name} ลุกขึ้นมาอีกครั้ง`);
      engine.boardFx("masterFx", { kind: "undeadRise", id: p.id, at: p.pos ? { ...p.pos } : null, size: 1 });
    }
  },
  // ---------- ฟื้น (เฟส 1) · ระหว่างรอตายไม่ได้ ----------
  deathless(engine, p) {
    if (!isMe(p)) return false;
    const s = st(p);
    if (s.down != null) { p.hp = Math.max(1, p.hp); return true; }
    if (s.phase === 1 && !s.revived && passiveOn(p)) {
      s.down = round(engine);
      p.hp = 1;
      engine.applyDebuff(p, "stun", 1, 1);
      engine.log(`💀 ${p.name} ล้มลง… แต่ยังไม่จบ`);
      fx(engine, p, "down", {});
      return true;
    }
    return false;
  },
  onDeath(engine, p) {
    if (!isMe(p)) return;
    engine.sfx(SFX.death);
    if (p.pos) fx(engine, p, "death", {});
  },
  // คนอื่นฮีลให้ไม่ได้ (ฮีลตัวเองได้)
  blocksHealFrom(engine, p, src) { return isMe(p) && !!src && src.id !== p.id; },

  // ---------- ตีปกติ ----------
  range(p) { return isMe(p) ? [1, 2] : null; },
  strikeRect(p) { return isMe(p) ? [1, 3] : null; },
  attackElement(engine, p) { return isMe(p) && passiveOn(p) ? (st(p).phase === 2 ? "light" : "poison") : null; },
  attackSound(p) { return isMe(p) ? SFX.melee : null; },
  attackStyle(p) { return isMe(p) ? (st(p).phase === 2 ? "masterSlash2" : "masterSlash") : null; },
  onStrikeLanded(engine, p, t, { counter } = {}) {
    if (!isMe(p) || counter) return null;
    curseHit(engine, p, t);
    return null;
  },
  extraStrike(engine, p) {
    if (!phase2(p)) return false;
    const s = st(p);
    if (s.extraUsed) return false;
    s.extraUsed = true;
    return true;
  },
  onActorStart(engine, p) { if (isMe(p)) st(p).extraUsed = false; },

  // ---------- สกิล ----------
  skillElement(engine, p, tier) {
    if (!isMe(p)) return null;
    const two = st(p).phase === 2;
    if (tier === "secondary") return two ? "light" : "wind";
    if (tier === "ultimate") return two ? "dark" : "bolt";
    return passiveOn(p) ? (two ? "light" : "poison") : null;
  },
  skillArea(p, tier, area) {
    if (!isMe(p)) return area;
    if (tier === "basic") { const a = slamArea(p); return { kind: "line", len: a.len, boxes: a.boxes, hostile: true }; }
    if (tier === "secondary") return knockArea(p);
    return area;
  },
  skillFree() { return true; },
  ignoresTurnQuota(p) {
    if (!phase2(p)) return false;
    const s = st(p);
    return s.pressRound === (require("../server/match").roundNumber || 0) && s.presses < 2;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p) || !p.pos) return false;
    const s = st(p), r = round(engine);
    if (cdLeft(s.ready[tier], r) > 0) return false;
    if (s.pressRound === r && s.presses >= (s.phase === 2 ? 2 : 1)) return false;
    if ((tier === "basic" || tier === "secondary") && !Board.LINE_DIRS[opts.dir]) return false;
    return true;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p) || !p.pos) return "";
    const s = st(p), r = round(engine);
    if (s.pressRound !== r) { s.pressRound = r; s.presses = 0; }
    s.presses++;
    if (tier === "basic") return castSlam(engine, p, opts.dir);
    if (tier === "secondary") return castKnock(engine, p, opts.dir);
    if (tier === "ultimate") return castSmite(engine, p);
    return "";
  },
  skillSound() { return null; }, // เสียงลงพร้อมเอฟเฟกต์ในโมดูล
  silentFlash() { return false; },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = round(engine);
    const spent = s.pressRound === r && s.presses >= (s.phase === 2 ? 2 : 1);
    const out = {};
    for (const tier of ["basic", "secondary", "ultimate"]) {
      const cd = cdLeft(s.ready[tier], r);
      out[tier] = { cd, locked: cd > 0 || !p.pos || spent };
    }
    return out;
  },
  skillPub(p, tier) {
    if (!isMe(p) || tier !== "basic") return null;
    const s = st(p);
    if (s.phase === 2 && (s.slamPress + 1) % 3 === 0) return { name: "Twin Sword Slam ★" };
    return null;
  },
  displayImg(p) { return isMe(p) ? (st(p).phase === 2 ? IMG.p2 : IMG.p1) : undefined; },
  characterPub(engine, p) { return isMe(p) ? { img: st(p).phase === 2 ? IMG.p2 : IMG.p1 } : null; },
  skillMusic(engine, p) {
    if (!isMe(p) || !p.alive) return null;
    const s = st(p);
    if (!s.landed) return null;
    return { music: s.phase === 2 ? MUSIC.p2 : MUSIC.p1, at: s.phase === 2 ? 2 : 1 };
  },
  // ผลค้าง: ไม่มีท่าที่เปิดค้าง (เฟส 2 ไม่ใช่ผลสกิล)
  severables() { return []; },

  // ---------- ข้อมูลให้ client (BoardStage → masterFx.js) ----------
  masterState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p), r = round(engine);
    return {
      phase: s.phase, landed: s.landed, down: s.down != null, standee: s.phase === 2 ? IMG.p2 : IMG.p1,
      landIn: s.landed ? 0 : Math.max(0, LAND_ROUND - r), summonIn: s.nextSummon != null ? Math.max(0, s.nextSummon - r) : null,
      slamBig: s.phase === 2 && (s.slamPress + 1) % 3 === 0,
    };
  },
};
Object.assign(module.exports, { curseHit, stackLv, addPoison, shockwave, summonWave, land, revive, slamArea, knockArea, isMe });

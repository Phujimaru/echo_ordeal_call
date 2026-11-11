// ============================================================
//  น็อตทิส — มหันตภัย · unique (GRID_PLAN §7.31 · ผู้ใช้ส่งสเปก + ตัดสิน 2026-11-11)
//
//  อาวุธของราชวงศ์ (0 · ปุ่ม 14 ตัวเลือก · เปลี่ยนได้เทิร์นละครั้ง ไม่กินโควตา ไม่ล็อกการเดิน) — ผลอยู่ในตาราง ARMS
//  Warp Strike (ปุ่ม HUD · 1 แต้ม): ขว้างอาวุธแนว 4×1 → วาร์ปไปหน้าเป้าคนแรก แล้วตีปกติผ่านท่อ engine.attackTarget (s.warp ตั้งระยะ/เป้าพิเศษ)
//  Warp Point (ปุ่ม HUD · 0 · เทิร์นละครั้ง): วาร์ปไปช่องติดสิ่งกีดขวางในระยะ 4 · หลบได้ 1 ครั้งจนต้นตาถัดไป (grantedDodge)
//  สกิลรอง (2 ตัวเลือก): ขานรับ เหล่าราชา (ตีครั้งถัดไปไม่มีผลเสีย + แม่นยำ + % ติดแน่นอน) · ทำลายให้สิ้น (PVP แนว 6×3 ดาเมจ 4 · Eos 13 นัดแบ่งเป้า + ระเบิด)
//  ท่าไม้ตาย (2 ตัวเลือก): ปลดปล่อยพลังที่แท้จริง (5 เทิร์น · สุ่มอาวุธทุกการตี) · ให้มันจบตรงนี้แหละ (เลือดตัวเองเหลือ 1 · ดาเมจ 9 ไม่ฆ่า · ล้างบัฟ)
//  สายเลือดราชา: ตีด้วยอาวุธราชวงศ์เสียเลือดตัวเอง 1 ต่อฮิต · กันตาย 1 ครั้ง
//  หัวใจของเหล่าปวงชน: ตายโดยไม่เคยฆ่าใคร → เหลือคู่ต่อสู้ 2 คน (ทีม: เพื่อนคนสุดท้าย) กำลังถูกฆ่า = คลิป → ผู้เล่นน็อตทิสเลือกเข้าช่วย/ปล่อย
//   เข้าช่วย = คลิป last_game → ผู้โจมตีตายทันที + ผู้ถูกช่วยชนะ (rescuesDeath — server/combat.js)
// ============================================================
const Board = require("../server/board");

const ID = "noctis";
const DIR = "/characters/noctis";
const IMG = {
  // ภาพจากผู้ใช้ 2026-11-11: noctis.jpg (ปก) · skill2.jpg (สกิลรอง) · skill3.jpg (ท่าไม้ตาย)
  base: `${DIR}/noctis.webp`, heed: `${DIR}/skill2.webp`, ruin: `${DIR}/skill2_2.webp`, unleash: `${DIR}/skill3.webp`, end: `${DIR}/skill3_2.webp`, // skil2.2.jpg / skill3.2.jpg = ร่างที่สองของช่อง
};
const VIDEO = {
  ruin: `${DIR}/noct_ruin.mp4`, unleash: `${DIR}/noct_unleash.mp4`, end: `${DIR}/noct_end.mp4`, guts: `${DIR}/noct_guts.mp4`,
  death: `${DIR}/noct_death.mp4`, atlas: `${DIR}/noct_atlas.mp4`, lastGame: `${DIR}/noct_last_game.mp4`,
};
const MUSIC = { unleash: "noct_magna_insomnia" }; // เพลงระหว่างปลดปล่อยพลังที่แท้จริง (ไฟล์ผู้ใช้ Magna Insomnia — client/src/audio.js)
const CUT = { ruin: "noctRuin", unleash: "noctUnleash", end: "noctEnd", guts: "noctGuts", death: "noctDeath", atlas: "noctAtlas", lastGame: "noctLastGame" };

const armImg = (f) => `${DIR}/arms/${f}.webp`;
const armClip = (f) => `${DIR}/arms/${f}.mp4`; // คลิปตีปกติตอนติดขานรับ เหล่าราชา (ไฟล์ผู้ใช้ 2026-11-11)
// อาวุธของราชวงศ์ — ลำดับตามสเปก · atk = พลังโจมตีเพิ่ม
const ARMS = {
  wise: { name: "Sword of the Wise", img: armImg("Sword-of-the-Wise"), clip: armClip("Sword-of-the-Wise"), clipSec: 1.3, desc: "สกิลจากผู้ที่อยู่ห่าง 4 ช่องขึ้นไป 70% ไม่มีผล" },
  axe: { name: "Axe of the Conqueror", img: armImg("Axe-of-the-Conqueror"), clip: armClip("Axe-of-the-Conqueror"), clipSec: 1.7, atk: 2, desc: "พลังโจมตี +2 · ระยะเดิน 2" },
  bow: { name: "Bow of the Clever", img: armImg("Bow-of-the-Clever"), clip: armClip("Bow-of-the-Clever"), clipSec: 1.6, desc: "ตีปกติระยะ 2–4 · คริ 25%" },
  wanderer: { name: "Swords of the Wanderer", img: armImg("Swords-of-the-Wanderer"), clip: armClip("Swords-of-the-Wanderer"), clipSec: 1.6, desc: "ตีปกติ 2 ครั้งต่อตา · เดินต่อได้ด้วยระยะที่เหลือ" },
  mystic: { name: "Blade of the Mystic", img: armImg("Blade-of-the-Mystic"), clip: armClip("Blade-of-the-Mystic"), clipSec: 1.4, atk: 1, desc: "พลังโจมตี +1 · 50% ติดไร้ทางเยียวยาหรือผุพัง 1 เทิร์น" },
  star: { name: "Star of the Rogue", img: armImg("Star-of-the-Rogue"), clip: armClip("Star-of-the-Rogue"), clipSec: 1.5, desc: "ตีปกติระยะ 1–3 · 50% เลือดไหล 1" },
  tall: { name: "Sword of the Tall", img: armImg("Sword-of-the-Tall"), clip: armClip("Sword-of-the-Tall"), clipSec: 2.5, atk: 2, desc: "พลังโจมตี +2 · เลือดไหล 2 · แม่นยำ 60%" },
  shield: { name: "Shield of the Just", img: armImg("Shield-of-the-Just"), clip: armClip("Shield-of-the-Just"), clipSec: 1.9, desc: "เกราะ +1 ทุกเทิร์น · ไม่เดินทั้งเทิร์น = พลังชีวิต +1 · ไม่เดินและติดสิ่งกีดขวาง = แต้มสกิล +1" },
  mace: { name: "Mace of the Fierce", img: armImg("Mace-of-the-Fierce"), clip: armClip("Mace-of-the-Fierce"), clipSec: 1.9, desc: "ผลักเป้า 2 ช่อง · ชน = ตรึง 1 เทิร์น + ดาเมจ 2" },
  scepter: { name: "Scepter of the Pious", img: armImg("Scepter-of-the-Pious"), clip: armClip("Scepter-of-the-Pious"), clipSec: 1.4, atk: 1, desc: "พลังโจมตี +1 · 40% ทะลุเกราะ" },
  trident: { name: "Trident of the Oracle", img: armImg("Trident-of-the-Oracle"), clip: armClip("Trident-of-the-Oracle"), clipSec: 1.4, desc: "ไม่ไถลบนน้ำแข็ง/พื้นเปียก · ตีปกติแนวตรง 2 ช่อง โดนทุกคนในแนว" },
  katana: { name: "Katana of the Warrior", img: armImg("Katana-of-the-Warrior"), clip: armClip("Katana-of-the-Warrior"), clipSec: 1.7, desc: "ตี 3 ฮิต (ฮิต 2: 50% · ฮิต 3: 25%) · คริ 25%" },
  father: { name: "Sword of the Father", img: armImg("Sword-of-the-Father"), clip: armClip("Sword-of-the-Father"), clipSec: 2.6, atk: 1, desc: "พลังโจมตี +1 · ต้นเทิร์นสุ่มแต้มสกิล/พลังชีวิต/เหรียญ +1" },
  engine: { name: "Engine Blade", img: armImg("Engine-Blade"), desc: "ตีปกติ · ไม่เสียพลังชีวิตตัวเอง" },
};
const ARM_KEYS = Object.keys(ARMS);
const ROYAL_KEYS = ARM_KEYS.filter((k) => k !== "engine");

const HP = 8;
const ARMOR = 2;
const SELF_DMG = 1;
const WISE_DIST = 4;
const WISE_PCT = 70;
const AXE_MOV = 2;
const BOW_RANGE = [2, 4];
const STAR_RANGE = [1, 3];
const TRIDENT_RANGE = [1, 2];
const CRIT_PCT = 25; // Bow / Katana
const MYSTIC_PCT = 50;
const STAR_PCT = 50;
const TALL_HIT = 60;
const TALL_BLEED = 2;
const STAR_BLEED = 1;
const MACE_PUSH = 2;
const MACE_DMG = 2;
const SCEPTER_PCT = 40;
const KATANA_P2 = 50;
const KATANA_P3 = 25;
// Warp Strike / Warp Point
const WARP_COST = 1;
const WARP_LEN = { base: 4, wise: 6, axe: 3, bow: 6 };
const POINT_RANGE = 4;
const WARP_THROW_S = 0.4; // อาวุธพุ่งถึงเป้า (client noctFx throw 380 ms)
const WARP_LAND_S = 0.55; // ร่างวาร์ปตามไปประกอบร่าง
// สกิลรอง / ท่าไม้ตาย
const HEED_COST = 3;
const HEED_POWER = 1; // ขานรับ: อาวุธที่ถือได้รับการเสริมพลัง (พลังโจมตี +1 — ผู้ใช้ 2026-11-11)
const heedCut = (k) => `noctHeed_${k}`;
const RUIN_COST = 3;
const RUIN_CD = 3;
const RUIN_AREA = { kind: "line", len: 6, width: 3, hostile: true };
const RUIN_DMG = 4;
const RUIN_EOS_RANGE = 6;
const RUIN_SHOTS = 13;
const RUIN_BLAST = 2;
const RUIN_EOS_COUNTS = [1, 2, 3, 4];
const UNLEASH_COST = 6;
const UNLEASH_TURNS = 5;
const UNLEASH_MOV = 2;
const UNLEASH_RANGE = [1, 4];
const END_COST = 0; // ผู้ใช้ 2026-11-11: ไม่ใช้แต้ม — จ่ายด้วยพลังชีวิตที่ลดเหลือ 1
const END_AREA = { kind: "line", len: 4, width: 1, hostile: true };
const END_DMG = 9;
const GUTS_HP = 2;
const GUTS_ARMOR = 1;
const HEART_SECONDS = 15; // หัวใจของเหล่าปวงชน: เวลาให้ผู้เล่นน็อตทิสตัดสิน (หมดเวลา = ปล่อย)
const PUSH_HOLD = 0.7;
const DIR4 = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

const isNoct = (p) => !!p && p.characterId === ID && !p.summon;
const eng = () => require("../server/engine").engine;
function fresh() {
  return {
    weapon: "engine", swapRound: -1, pointRound: -1, heed: false, ruinReady: 0, unleash: null, endUsed: false,
    gutsUsed: false, kills: 0, heartUsed: false, heart: null, warp: null, dodge: false, movedRound: -1,
    selfHits: 0, roll: null, wand: 0, wandLeft: 0, skillTurn: null, pushDir: null,
  };
}
function st(p) { return p.noct || (p.noct = fresh()); }
const roll = (pct) => Math.random() * 100 < pct;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const unleashed = (p) => isNoct(p) && !!st(p).unleash;
const turnKey = (engine) => `${engine.roundNumber}|${engine.actorId || ""}`;
const nextTurnSpan = (engine, t, n = 1) => n + (engine.hasActed(t.id) || engine.actorId === t.id ? 1 : 0);
const foeOf = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t) && engine.dim.same(p, t);
const fx = (engine, p, kind, extra = {}) => engine.boardFx("noctFx", { kind, id: p.id, at: p.pos ? { ...p.pos } : null, ...extra });

// อาวุธที่ใช้ตีครั้งนี้: ปกติ = ที่ถืออยู่ · ปลดปล่อย = สุ่ม 1 ใน 13 ต่อคำสั่ง (ทุกฮิตของการตีเดียวกันใช้อาวุธเดียวกัน)
function weaponOf(p) {
  const s = st(p);
  if (!s.unleash) return s.weapon;
  const k = `${eng().cmdSeq}|${eng().commandSeq}`;
  if (!s.roll || s.roll.k !== k) s.roll = { k, w: pick(ROYAL_KEYS) };
  return s.roll.w;
}
// ผลฝั่งเดิน/ติดตัวของอาวุธ (ไม่มีผลระหว่างปลดปล่อย)
const holding = (p, k) => isNoct(p) && !st(p).unleash && st(p).weapon === k;
const heeding = (p) => isNoct(p) && st(p).heed;
// โอกาส % ของอาวุธ (ขานรับ เหล่าราชา = ติดแน่นอน)
const chance = (p, pct) => heeding(p) || roll(pct);

// ---------- ดาเมจจากสกิลของน็อตทิส (นอกท่อ skillStrike — จัดการคนตายเอง) ----------
function hurt(engine, p, t, n, reason, { noKill = false } = {}) {
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, reason)) return { dodge: true, dealt: 0, kill: false };
  let amt = n + (engine.statusAmtOf(t, "fragile") || 0);
  if (noKill) amt = Math.max(0, Math.min(amt, (t.armor || 0) + (t.hp || 0) - 1));
  const before = (t.hp || 0) + (t.armor || 0);
  engine.dealMixed(t, amt);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  const kill = !t.alive;
  if (kill) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return { dodge: false, dealt, kill };
}
function selfHurt(engine, p, n) {
  if (!(n > 0) || !p.alive) return;
  engine.dealMixed(p, n);
  engine.log(`🩸 สายเลือดราชา — ${p.name} เสียพลังชีวิต ${n}`);
  if (p.alive && p.hp <= 0) engine.instantDeath(p);
  if (!p.alive) p.pos = null;
}

// ---------- แนวตรงจากตัว ----------
function lineFrom(engine, p, dir, len) {
  const d = DIR4[dir], map = engine.boardMap(), out = [];
  if (!d || !p.pos) return out;
  for (let i = 1; i <= len; i++) {
    const x = Board.wx(p.pos.x + d.x * i), y = p.pos.y + d.y * i;
    if (!Board.inBounds(map, x, y)) break;
    out.push({ x, y, d: i });
  }
  return out;
}
function unitOn(engine, x, y) { return Board.unitAt(engine.boardUnits(), x, y); }
// ศัตรูที่มองเห็นในแนว เรียงจากใกล้ → ไกล
function foesInLine(engine, p, dir, len) {
  const out = [];
  for (const t of lineFrom(engine, p, dir, len)) {
    const u = unitOn(engine, t.x, t.y);
    const o = u && engine.players[u.id];
    if (o && foeOf(engine, p, o) && !engine.hiddenFromUnit(p, o) && !out.some((x) => x.u.id === o.id)) out.push({ u: o, t });
  }
  return out;
}
const dirOfTile = (p, tile) => {
  const dx = Board.wdx(p.pos.x, tile.x), dy = tile.y - p.pos.y;
  if (dx && dy) return null;
  if (dx) return dx > 0 ? "right" : "left";
  if (dy) return dy > 0 ? "down" : "up";
  return null;
};
// ช่องลงหลังวาร์ป: ช่องหน้าเป้า (ฝั่งน็อตทิส) · ว่างไม่ได้ = ช่องว่างรอบเป้า · ไม่มี = ไม่ขยับ
function landNear(engine, p, target, dir) {
  const d = DIR4[dir];
  const front = { x: Board.wx(target.pos.x - d.x), y: target.pos.y - d.y };
  if (front.x === p.pos.x && front.y === p.pos.y) return null;
  if (engine.tileFree(front.x, front.y, p.id)) return front;
  for (const k of ["up", "down", "left", "right"]) {
    const o = DIR4[k], c = { x: Board.wx(target.pos.x + o.x), y: target.pos.y + o.y };
    if (c.x === p.pos.x && c.y === p.pos.y) return null;
    if (engine.tileFree(c.x, c.y, p.id)) return c;
  }
  return null;
}
function warpLen(p) {
  const w = unleashed(p) ? "base" : st(p).weapon;
  return WARP_LEN[w] || WARP_LEN.base;
}
function warpReady(engine, p) {
  const a = engine.action;
  return !!p.alive && !!p.pos && engine.canAct(p) && !!a && !a.noStrike && !a.canto && (p.skillPoints || 0) >= WARP_COST
    && !((p.statuses.rooted || 0) > 0) && !engine.stuck(p) && !st(p).warp;
}
function warpTiles(engine, p) {
  const out = [], len = warpLen(p);
  for (const dir of Object.keys(DIR4)) {
    if (!foesInLine(engine, p, dir, len).length) continue;
    for (const t of lineFrom(engine, p, dir, len)) out.push({ x: t.x, y: t.y });
  }
  return out;
}
// ช่องปลายทาง Warp Point: ช่องว่างที่ติดสิ่งกีดขวาง (4 ทิศ) ในระยะ 4
function pointTiles(engine, p) {
  if (!p.pos) return [];
  const map = engine.boardMap(), blocked = engine.boardBlocked(p.id), out = [];
  for (let dy = -POINT_RANGE; dy <= POINT_RANGE; dy++) {
    for (let dx = -POINT_RANGE; dx <= POINT_RANGE; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);
      if (!d || d > POINT_RANGE) continue;
      const x = Board.wx(p.pos.x + dx), y = p.pos.y + dy;
      if (!Board.inBounds(map, x, y) || !engine.tileFree(x, y, p.id)) continue;
      const nearObs = Object.values(DIR4).some((o) => {
        const nx = Board.wx(x + o.x), ny = y + o.y;
        return Board.inBounds(map, nx, ny) && Board.isObstacle(map, nx, ny, blocked) && !unitOn(engine, nx, ny);
      });
      if (nearObs) out.push({ x, y });
    }
  }
  return out;
}
function pointReady(engine, p) {
  return !!p.alive && !!p.pos && engine.canAct(p) && !!engine.action && !engine.action.canto && st(p).pointRound !== engine.roundNumber && !engine.stuck(p);
}
function teleport(engine, p, to, kind) {
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  const a = engine.action;
  if (a) Object.assign(a, { from: { ...p.pos }, moved: false, path: null, trail: null, iceUndo: null, smashed: null });
  st(p).movedRound = engine.roundNumber;
  engine.setDash({ id: p.id, path: [from, { ...p.pos }] });
  fx(engine, p, kind, { from, to: { ...p.pos } });
  engine.sfx(kind === "point" ? "noct_point" : "noct_warp");
}

// ---------- Warp Strike ----------
function warpStrike(engine, p, tile) {
  if (!warpReady(engine, p) || !tile) return false;
  const dir = dirOfTile(p, tile);
  if (!dir) return false;
  const len = warpLen(p);
  const foes = foesInLine(engine, p, dir, len);
  if (!foes.length) return false;
  const s = st(p);
  const w = unleashed(p) ? null : s.weapon;
  let target = foes[0].u, extra = [], stay = false;
  if (w === "star") { target = foes[foes.length - 1].u; extra = foes.slice(0, -1).map((f) => f.u); }
  else if (w === "trident") extra = foes.slice(1, 2).map((f) => f.u);
  if (w === "bow") stay = true;
  const from = { ...p.pos };
  p.skillPoints -= WARP_COST;
  s.warp = {
    targetId: target.id, dir, double: w === "wanderer",
    extra: extra.map((u) => u.id), tiles: extra.map((u) => ({ x: u.pos.x, y: u.pos.y })),
  };
  s.pushDir = DIR4[dir];
  const land = stay ? null : landNear(engine, p, target, dir);
  // ผู้ใช้ 2026-11-11: อาวุธต้องพุ่งไปถึงก่อน → ร่างแตกเป็นผลึกวาร์ปตาม → ตี (พักฉากด้วย skillBeat — ตาเดินกลับเป็น ACTION แล้วค่อยตี)
  fx(engine, p, "throw", { dir, to: { ...target.pos }, weapon: w || weaponOf(p) });
  engine.sfx("noct_throw");
  engine.log(`🗡️ ${p.name} Warp Strike → ${target.name}`);
  if (engine.action) engine.action.locked = true;
  const refund = () => {
    s.warp = null;
    s.pushDir = null;
    p.skillPoints += WARP_COST;
    if (land && p.alive) p.pos = from;
    engine.broadcastState();
  };
  const strike = () => {
    if (!p.alive || !target.alive || !target.pos || !engine.canAct(p)) { refund(); return; }
    if (!engine.attackTarget(p.id, target.id)) refund();
  };
  engine.skillBeat(WARP_THROW_S, () => { if (land && p.alive) teleport(engine, p, land, "warp"); });
  engine.skillBeat(land ? WARP_LAND_S : 0.05, () => { setTimeout(strike, 0); }); // ตีหลังฉากจบ (ตาเดินกลับมาเป็น ACTION ก่อน)
  engine.pausePlayingForCutscene();
  return true;
}
function warpPoint(engine, p, tile) {
  if (!pointReady(engine, p) || !tile) return false;
  const pickT = pointTiles(engine, p).find((t) => t.x === tile.x && t.y === tile.y);
  if (!pickT) return false;
  const s = st(p);
  s.pointRound = engine.roundNumber;
  s.dodge = true;
  teleport(engine, p, pickT, "point");
  if (engine.action) engine.action.locked = true; // วาร์ปแล้วเดินต่อไม่ได้ (ยังตีได้)
  engine.log(`🌀 ${p.name} Warp Point`);
  engine.broadcastState();
  return true;
}

// ---------- ทำลายให้สิ้น ----------
function ruinPvp(engine, p, dir) {
  const tiles = engine.areaTiles(p, RUIN_AREA, dir);
  const set = new Set(tiles.map((t) => Board.key(t.x, t.y)));
  const victims = engine.boardUnits().filter((u) => set.has(Board.key(u.x, u.y)) || Board.footprint(u.x, u.y, u.size || 1).some((c) => set.has(Board.key(c.x, c.y))))
    .map((u) => engine.players[u.id]).filter((t) => foeOf(engine, p, t));
  fx(engine, p, "ruin", { dir, tiles });
  engine.sfx("noct_ruin");
  for (const t of victims) {
    const r = hurt(engine, p, t, RUIN_DMG, "ทำลายให้สิ้น");
    engine.log(r.dodge ? `💨 ${t.name} หลบทำลายให้สิ้นได้` : `⚔️ ทำลายให้สิ้น → ${t.name} -${r.dealt}`);
  }
  engine.hitArea(p, tiles, victims.map((t) => t.id));
}
function ruinEos(engine, p, ids) {
  const targets = ids.map((id) => engine.players[id]).filter((t) => foeOf(engine, p, t));
  if (!targets.length) return;
  const n = targets.length, base = Math.floor(RUIN_SHOTS / n), rest = RUIN_SHOTS % n;
  const spots = [];
  targets.forEach((t, i) => {
    const shots = base + (i < rest ? 1 : 0);
    const at = { ...t.pos };
    let dealt = 0;
    for (let k = 0; k < shots && t.alive; k++) dealt += hurt(engine, p, t, 1, "ทำลายให้สิ้น").dealt;
    engine.log(`⚔️ ทำลายให้สิ้น ×${shots} → ${t.name} -${dealt}`);
    spots.push(at);
  });
  fx(engine, p, "ruinEos", { spots });
  engine.sfx("noct_ruin");
  // ระเบิดซ้ำ: ศัตรูรอบตัวเป้าแต่ละตัว (8 ช่อง) ดาเมจ 2
  const hit = new Set();
  for (const c of spots) {
    for (const o of Object.values(engine.players)) {
      if (!foeOf(engine, p, o) || Math.max(Math.abs(Board.wdx(c.x, o.pos.x)), Math.abs(o.pos.y - c.y)) !== 1) continue;
      const r = hurt(engine, p, o, RUIN_BLAST, "ระเบิดอาวุธราชวงศ์");
      hit.add(o.id);
      if (!r.dodge) engine.log(`💥 ระเบิดอาวุธราชวงศ์ → ${o.name} -${r.dealt}`);
    }
  }
  engine.hitArea(p, spots, [...targets.map((t) => t.id), ...hit]);
}
const eosMode = (engine) => engine.gameMode === "eos";
// ช่องสกิลรอง (ผู้ใช้ 2026-11-11): ปกติ = ขานรับ เหล่าราชา · ระหว่างปลดปล่อยพลังที่แท้จริง = ทำลายให้สิ้น (ไม่อยู่พร้อมกัน)
// ช่องท่าไม้ตาย (ผู้ใช้ 2026-11-11): ปกติ = ปลดปล่อยพลังที่แท้จริง · ระหว่างปลดปล่อย = ให้มันจบตรงนี้แหละ
const ultForm = (p) => (st(p).unleash ? "end" : "unleash");
function secForm(p, opts = {}) {
  const f = opts.form;
  if (!st(p).unleash) return "heed";
  return f && /^ruin\d?$/.test(f) ? f : "ruin";
}
const ruinCd = (engine, p) => (eosMode(engine) ? 0 : Math.max(0, st(p).ruinReady - engine.roundNumber));

// ---------- ให้มันจบตรงนี้แหละ ----------
function endItHere(engine, p, ids) {
  const t = engine.players[ids[0]];
  if (!t || !foeOf(engine, p, t)) return;
  fx(engine, p, "end", { to: { ...t.pos } });
  engine.sfx("noct_end");
  const r = hurt(engine, p, t, END_DMG, "ให้มันจบตรงนี้แหละ", { noKill: true });
  if (r.dodge) { engine.log(`💨 ${t.name} หลบ ให้มันจบตรงนี้แหละ ได้`); return; }
  let n = 0;
  while (engine.stripLatestBuff(t)) n++;
  engine.log(`👑 ให้มันจบตรงนี้แหละ → ${t.name} -${r.dealt}${n ? ` · ล้างบัฟ ${n}` : ""}`);
}

// ---------- หัวใจของเหล่าปวงชน ----------
const heartMode = (engine) => !eosMode(engine) && engine.world !== "moon";
const owners = (engine) => Object.values(engine.players).filter((o) => !o.summon);
function heartCandidate(engine) {
  return owners(engine).find((n) => isNoct(n) && !n.alive && st(n).kills === 0 && (!st(n).heartUsed || (st(n).heart && !st(n).heart.done)));
}
function startDecide(engine, n) {
  const h = st(n).heart;
  if (!h || h.done) return;
  const v = engine.players[h.victimId], a = engine.players[h.attackerId];
  if (!v || !v.alive || !a || !a.alive) { h.done = true; return; }
  h.deciding = true;
  h.choice = n.connected === false ? false : null;
  engine.log(`👑 หัวใจของเหล่าปวงชน — ${n.name}`);
  engine.skillBeat(n.connected === false ? 0.5 : HEART_SECONDS, () => resolveHeart(engine, n), { open: true });
}
function resolveHeart(engine, n) {
  const h = st(n).heart;
  if (!h || h.done) return;
  h.deciding = false;
  h.done = true;
  const v = engine.players[h.victimId], a = engine.players[h.attackerId];
  if (!v || !v.alive) return;
  if (h.choice && a && a.alive) {
    engine.log(`👑 ${n.name} กลับมาช่วย ${v.name}`);
    engine.queueCutscene(n, CUT.lastGame);
    engine.deferAfterCutscene(() => {
      if (a.alive) engine.withEffectSource(n, () => { engine.instantDeath(a, "absolute"); });
      if (!a.alive) { a.pos = null; engine.log(`💀 ${a.name} ถูกน็อตทิสสังหาร`); }
      v.hp = Math.max(1, v.hp || 0);
      engine.declareWinner(v);
    });
    return;
  }
  engine.log(`🕊️ ${n.name} ปล่อยให้เป็นไป`);
  const die = () => engine.instantDeath(v, true);
  if (a) engine.withEffectSource(a, die); else die();
  if (!v.alive) { v.pos = null; engine.log(`💀 ${v.name} เลือดจริงหมด ตกรอบ!`); }
}

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, ARMS, HEED_POWER, heedCut, ARM_KEYS, ROYAL_KEYS, HP, ARMOR, WISE_DIST, WISE_PCT, AXE_MOV, BOW_RANGE, STAR_RANGE, TRIDENT_RANGE, CRIT_PCT,
  TALL_HIT, TALL_BLEED, MACE_PUSH, MACE_DMG, SCEPTER_PCT, WARP_COST, WARP_LEN, POINT_RANGE, HEED_COST, RUIN_COST, RUIN_CD, RUIN_AREA, RUIN_DMG,
  RUIN_EOS_RANGE, RUIN_SHOTS, RUIN_BLAST, UNLEASH_COST, UNLEASH_TURNS, UNLEASH_MOV, UNLEASH_RANGE, END_COST, END_AREA, END_DMG, GUTS_HP,
  HEART_SECONDS,
  isNoct, warpTiles, pointTiles,

  resetCombat(p) { p.noct = isNoct(p) ? fresh() : null; },
  maxHp() { return HP; },
  maxArmor() { return ARMOR; },

  // ---------- อาวุธ: ระยะเดิน / ระยะตี ----------
  mov(p) {
    if (!isNoct(p)) return null;
    if (unleashed(p)) return 4 + UNLEASH_MOV;
    return holding(p, "axe") && !heeding(p) ? AXE_MOV : null;
  },
  range(p) {
    if (!isNoct(p)) return null;
    const s = st(p);
    if (s.warp) return [1, 30]; // Warp Strike: เป้าถูกเลือกจากแนวขว้างแล้ว
    if (s.unleash) return UNLEASH_RANGE;
    if (s.weapon === "bow") return BOW_RANGE;
    if (s.weapon === "star") return STAR_RANGE;
    if (s.weapon === "trident") return TRIDENT_RANGE;
    return null;
  },
  attackLane(p) { return holding(p, "trident") && !st(p).warp; },
  // Warp Strike แบบทะลุ (Star / Trident): คนอื่นในแนวโดนตีปกติด้วย — ใช้ท่อ strikeRing ของ laneVictims
  strikeRing(p) { return isNoct(p) && !!st(p).warp && st(p).warp.extra.length > 0; },
  ringTiles(engine, p) { return isNoct(p) && st(p).warp ? st(p).warp.tiles : []; },
  noSlide(p) { return holding(p, "trident"); },

  // ---------- อาวุธ: ผลตอนตี ----------
  damageBonus(engine, attacker) { return isNoct(attacker) ? (ARMS[weaponOf(attacker)].atk || 0) + (heeding(attacker) ? HEED_POWER : 0) : 0; },
  // ขานรับ เหล่าราชา + อาวุธราชวงศ์: คลิปท่าของอาวุธนั้นก่อนฉากตีทุกครั้ง (Engine Blade ไม่มีคลิป)
  preAttackClip(engine, attacker) {
    if (!heeding(attacker)) return null;
    const w = weaponOf(attacker);
    return ARMS[w] && ARMS[w].clip ? heedCut(w) : null;
  },
  critPct(p) {
    if (!isNoct(p)) return 0;
    const w = weaponOf(p);
    return w === "bow" || w === "katana" ? (heeding(p) ? 100 : CRIT_PCT) : 0;
  },
  strikeMiss(p) {
    if (!isNoct(p) || weaponOf(p) !== "tall" || heeding(p)) return null;
    return roll(100 - TALL_HIT) ? { name: ARMS.tall.name, img: ARMS.tall.img } : null;
  },
  strikeHitPct(p) { return isNoct(p) && weaponOf(p) === "tall" && !heeding(p) ? TALL_HIT : null; },
  strikePierces(engine, attacker) { return isNoct(attacker) && weaponOf(attacker) === "scepter" && chance(attacker, SCEPTER_PCT); },
  strikeRepeat(p) {
    if (!isNoct(p)) return 0;
    const s = st(p), w = weaponOf(p);
    if (s.warp && s.warp.double) return 1;
    if (s.unleash && w === "wanderer") return 1;
    if (w !== "katana") return 0;
    if (heeding(p)) return 2;
    if (!roll(KATANA_P2)) return 0;
    return roll(KATANA_P3) ? 2 : 1;
  },
  // ท่าตีบนกระดาน (client/src/board/noctFx.js): อาวุธที่ถือพุ่งเข้าเป้า · ปลดปล่อย = อาวุธจากวง Armiger 3 ชิ้นต่อกัน
  attackStyle(p) { return isNoct(p) ? (st(p).unleash ? "noct_armiger" : `noct_${weaponOf(p)}`) : null; },
  // เสียงตีตามชนิดอาวุธ (ยืมเสียงอาวุธของโรลันด์/ชิโร่ — client/src/audio.js noct_atk_*)
  attackSound(p) { return isNoct(p) ? `noct_atk_${weaponOf(p)}` : undefined; },
  attackFxNames(attacker) {
    if (!isNoct(attacker)) return [];
    const w = weaponOf(attacker), out = [];
    if (w !== "engine") out.push(ARMS[w].name);
    if (heeding(attacker)) out.push(`ขานรับ เหล่าราชา — เสริมพลัง +${HEED_POWER}`);
    return out;
  },
  onStrikeLanded(engine, attacker, target) {
    if (!isNoct(attacker) || !target.alive) return [];
    const w = weaponOf(attacker), out = [];
    if (w === "mystic" && chance(attacker, MYSTIC_PCT)) {
      const key = pick(["nohealing", "decay"]);
      if (engine.applyDebuff(target, key, null, nextTurnSpan(engine, target))) out.push(key === "nohealing" ? "ไร้ทางเยียวยา" : "ผุพัง");
    }
    if (w === "star" && chance(attacker, STAR_PCT) && engine.applyBleed(target, STAR_BLEED)) out.push(`เลือดไหล ${STAR_BLEED}`);
    if (w === "tall" && engine.applyBleed(target, TALL_BLEED)) out.push(`เลือดไหล ${TALL_BLEED}`);
    return out;
  },
  // สายเลือดราชา: นับทุกฮิต (รวมพลาด) ของอาวุธราชวงศ์ → เสียเลือดหลังฉากตี
  onStrikeResolved(engine, attacker, target, res, { counter } = {}) {
    if (!isNoct(attacker) || counter) return;
    const s = st(attacker);
    if (s.unleash || heeding(attacker) || weaponOf(attacker) === "engine") return;
    s.selfHits++;
  },
  afterBoardAttack(engine, attacker, target) {
    if (!isNoct(attacker)) return null;
    const s = st(attacker);
    const w = weaponOf(attacker);
    const warpDir = s.warp ? DIR4[s.warp.dir] : null;
    const pushN = w === "mace" ? MACE_PUSH : (s.warp && w === "axe" && !s.unleash ? 1 : 0);
    return () => {
      let hold = 0;
      if (pushN && target.alive && target.pos && attacker.pos) {
        const d = warpDir || {
          x: Math.sign(Board.wdx(attacker.pos.x, target.pos.x)) * (Math.abs(Board.wdx(attacker.pos.x, target.pos.x)) >= Math.abs(target.pos.y - attacker.pos.y) ? 1 : 0),
          y: Math.abs(Board.wdx(attacker.pos.x, target.pos.x)) >= Math.abs(target.pos.y - attacker.pos.y) ? 0 : Math.sign(target.pos.y - attacker.pos.y),
        };
        // ชน = ผลักได้ไม่ครบระยะเพราะช่องถัดไปยืนไม่ได้ (ไม่นับหยุดบนน้ำแข็ง)
        let free = 0;
        for (let i = 1; i <= pushN; i++) {
          if (!engine.tileFree(Board.wx(target.pos.x + d.x * i), target.pos.y + d.y * i, target.id)) break;
          free++;
        }
        const ctx = engine.ice.begin();
        engine.ice.pushUnit(target, d, ctx, pushN);
        engine.ice.flush(ctx);
        hold = PUSH_HOLD;
        if (w === "mace" && free < pushN && target.alive) {
          if (engine.applyDebuff(target, "rooted", 1, nextTurnSpan(engine, target))) engine.log(`🔨 ${target.name} กระแทก — ถูกตรึง 1 เทิร์น`);
          const r = hurt(engine, attacker, target, MACE_DMG, ARMS.mace.name);
          if (!r.dodge) engine.log(`🔨 ${ARMS.mace.name} → ${target.name} -${r.dealt}`);
        }
      }
      const n = s.selfHits;
      s.selfHits = 0;
      selfHurt(engine, attacker, n * SELF_DMG);
      return hold;
    };
  },
  afterStrike(engine, p) {
    if (!isNoct(p)) return;
    const s = st(p);
    s.heed = false;
    s.warp = null;
    s.pushDir = null;
    // Wanderer: เก็บระยะเดินที่เหลือไว้เดินต่อ
    if (holding(p, "wanderer") && p.alive && p.pos && engine.action) {
      if (engine.action.moved) engine.rebaseMove(p);
      s.wandLeft = s.skillTurn === turnKey(engine) ? 0 : Math.max(0, engine.movOf(p));
    }
  },
  extraStrike(engine, p) {
    if (!holding(p, "wanderer")) return false;
    const s = st(p);
    if (s.wand >= 1) return false;
    s.wand++;
    const a = engine.action;
    if (a && p.pos) {
      Object.assign(a, { from: { ...p.pos }, moved: false, path: null, trail: null, iceUndo: null, smashed: null, movLeft: s.wandLeft });
      a.locked = !(s.wandLeft > 0);
    }
    return true;
  },
  cantoMov(engine, p) {
    if (!holding(p, "wanderer")) return 0;
    const s = st(p);
    return s.wand >= 1 && p.didAttackRound ? s.wandLeft : 0;
  },
  onActorStart(engine, p) {
    if (!isNoct(p)) return;
    const s = st(p);
    s.dodge = false; // หลบหลีกจาก Warp Point อยู่ถึงต้นตาถัดไป
    s.wand = 0;
    s.wandLeft = 0;
  },
  onUnitWalked(engine, u) { if (isNoct(u)) st(u).movedRound = engine.roundNumber; },

  // Sword of the Wise: สกิลจากผู้ที่อยู่ห่าง ≥4 ช่อง 70% ไม่มีผล · Warp Point: หลบ 1 ครั้ง
  grantedDodge(engine, target, attacker) {
    if (!isNoct(target) || !target.alive) return null;
    const s = st(target);
    if (s.dodge) { s.dodge = false; return { name: "Warp Point", img: IMG.base }; }
    if (holding(target, "wise") && !engine.inStrike() && attacker && attacker.pos && target.pos && attacker.id !== target.id
      && Board.dist(Board.boxOf(attacker), Board.boxOf(target)) >= WISE_DIST && roll(WISE_PCT)) {
      return { name: ARMS.wise.name, img: ARMS.wise.img };
    }
    return null;
  },
  dodgeSure(engine, target) { return isNoct(target) && st(target).dodge; },

  // ---------- จังหวะเทิร์น ----------
  onRoundStartTick(engine, p) {
    if (!isNoct(p) || !p.alive) return;
    const s = st(p);
    if (s.unleash && engine.roundNumber > s.unleash.cast) engine.addSkill(p, 1);
    if (holding(p, "father")) {
      const k = pick(["sp", "hp", "gold"]);
      if (k === "sp") engine.addSkill(p, 1);
      else if (k === "hp") engine.healHp(p, 1);
      else engine.addGold(p, 1);
      engine.log(`👑 ${ARMS.father.name} — ${p.name} ${k === "sp" ? "แต้มสกิล" : k === "hp" ? "พลังชีวิต" : "เหรียญ"} +1`);
    }
  },
  onEndTurn(engine) {
    const r = engine.roundNumber;
    for (const p of Object.values(engine.players)) {
      if (!isNoct(p) || !p.alive) continue;
      const s = st(p);
      if (holding(p, "shield")) {
        engine.healArmor(p, 1);
        if (s.movedRound !== r) {
          engine.healHp(p, 1);
          const map = engine.boardMap(), blocked = engine.boardBlocked(p.id);
          const byWall = p.pos && Object.values(DIR4).some((o) => {
            const x = Board.wx(p.pos.x + o.x), y = p.pos.y + o.y;
            return Board.inBounds(map, x, y) && Board.isObstacle(map, x, y, blocked) && !unitOn(engine, x, y);
          });
          if (byWall) engine.addSkill(p, 1);
        }
      }
      if (s.unleash && r >= s.unleash.until) { s.unleash = null; engine.log(`👑 ${p.name} — พลังที่แท้จริงสงบลง`); }
    }
  },

  // ---------- สายเลือดราชา: กันตาย ----------
  preventDeath(engine, p) {
    if (!isNoct(p)) return false;
    const s = st(p);
    if (s.gutsUsed) return false;
    s.gutsUsed = true;
    p.hp = GUTS_HP;
    p.armor = Math.min(engine.maxArmorOf(p), (p.armor || 0) + GUTS_ARMOR);
    engine.log(`👑 สายเลือดราชา — ${p.name} ลุกขึ้นอีกครั้ง`);
    engine.queueCutscene(p, CUT.guts);
    engine.wantFlow();
    return true;
  },
  onKill(engine, killer, victim) { if (isNoct(killer) && victim && !victim.summon && victim.id !== killer.id) st(killer).kills++; },
  onDeath(engine, p) {
    if (!isNoct(p)) return;
    const s = st(p);
    s.unleash = null;
    s.heed = false;
    s.warp = null;
    if (s.kills === 0 && heartMode(engine)) {
      engine.queueCutscene(p, CUT.death);
      engine.wantFlow();
    }
  },
  // หัวใจของเหล่าปวงชน (broadcast จาก combat.instantDeath)
  rescuesDeath(engine, v, force) {
    if (!v || v.summon || !heartMode(engine)) return false;
    const n = heartCandidate(engine);
    if (!n || n.id === v.id) return false;
    const s = st(n);
    if (s.heart && !s.heart.done) { // ระหว่างรอตัดสิน: ผู้ถูกช่วยยังไม่ตาย
      if (s.heart.victimId !== v.id) return false;
      v.hp = Math.max(1, v.hp || 0);
      return true;
    }
    if (s.heartUsed) return false;
    const a = engine.effectSourceId && engine.players[engine.effectSourceId];
    if (!a || a.summon || !a.alive || a.id === v.id || engine.sameTeam(a, v)) return false;
    const live = owners(engine).filter((o) => o.alive);
    if (engine.teamModeActive()) {
      if (!engine.sameTeam(n, v)) return false;
      if (live.some((o) => o.id !== v.id && engine.sameTeam(n, o))) return false; // ยังมีเพื่อนคนอื่นรอด
    } else if (live.length !== 2) return false; // FFA: เหลือคู่ต่อสู้ 2 คนสุดท้าย
    s.heartUsed = true;
    s.heart = { victimId: v.id, attackerId: a.id, choice: null, deciding: false, done: false };
    v.hp = Math.max(1, v.hp || 0);
    engine.log(`👑 ${v.name} กำลังจะถูก ${a.name} สังหาร…`);
    engine.queueCutscene(n, CUT.atlas);
    engine.deferAfterCutscene(() => startDecide(engine, n));
    engine.wantFlow();
    return true;
  },
  heartAction(engine, id, yes) {
    const n = engine.players[id];
    if (!isNoct(n)) return false;
    const h = st(n).heart;
    if (!h || !h.deciding || h.done) return false;
    h.choice = !!yes;
    engine.releaseBeat();
    return true;
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isNoct(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      const w = ARMS[s.weapon];
      return {
        name: w.name, img: w.img,
        choices: ARM_KEYS.map((k) => ({
          key: k, name: ARMS[k].name, img: ARMS[k].img, fit: "contain", desc: `${ARMS[k].name}: ${ARMS[k].desc}`,
          area: { kind: "self" }, cost: 0, free: true, active: s.weapon === k, locked: s.swapRound === r || !!s.unleash,
        })),
      };
    }
    if (tier === "secondary") {
      if (!s.unleash) {
        return { name: "ขานรับ เหล่าราชา", img: IMG.heed, cost: HEED_COST, area: { kind: "self" }, flash: true,
          desc: "ตีปกติ/Warp Strike ครั้งถัดไปพลังโจมตี +1 · ไม่เสียพลังชีวิตตัวเอง · แม่นยำ · ผลที่เป็นโอกาสติดแน่นอน · ไม่มีผลเสียของอาวุธ (ระหว่างปลดปล่อยพลังที่แท้จริงเปลี่ยนเป็นทำลายให้สิ้น)" };
      }
      if (!eosMode(engine)) {
        return { name: "ทำลายให้สิ้น", img: IMG.ruin, cost: RUIN_COST, area: RUIN_AREA, flash: true,
          desc: `เลือกทิศ แนว 6×3 · ดาเมจ ${RUIN_DMG} (ลดเกราะก่อน) · คูลดาวน์ ${RUIN_CD} เทิร์น` };
      }
      const near = p.pos ? Object.values(engine.players).filter((t) => foeOf(engine, p, t) && Board.dist(Board.boxOf(p), Board.boxOf(t)) <= RUIN_EOS_RANGE).length : 0;
      return {
        name: "ทำลายให้สิ้น", img: IMG.ruin, flash: true,
        choices: RUIN_EOS_COUNTS.map((n) => ({
          key: `ruin${n}`, name: `ทำลายให้สิ้น ×${n}`, img: IMG.ruin, cost: RUIN_COST,
          area: { kind: "target", range: RUIN_EOS_RANGE, count: n, hostile: true }, locked: near < n,
          desc: `ทำลายให้สิ้น: เลือกศัตรู ${n} ตัวในระยะ ${RUIN_EOS_RANGE} · อาวุธ ${RUIN_SHOTS} ชิ้นแบ่งยิง ชิ้นละ 1 · ศัตรูรอบตัวเป้าโดนระเบิด ${RUIN_BLAST}`,
        })),
      };
    }
    if (tier === "ultimate") {
      if (!s.unleash) {
        return { name: "ปลดปล่อยพลังที่แท้จริง", img: IMG.unleash, cost: UNLEASH_COST, area: { kind: "self" }, flash: true,
          desc: `${UNLEASH_TURNS} เทิร์น · ระยะเดิน +${UNLEASH_MOV} · ตีปกติระยะ 1–4 · ทุกการตีสุ่มอาวุธราชวงศ์ · แต้มสกิล +1 ต่อเทิร์น · ไม่เสียพลังชีวิตตัวเอง (ระหว่างนี้ช่องนี้เปลี่ยนเป็นให้มันจบตรงนี้แหละ)` };
      }
      return { name: "ให้มันจบตรงนี้แหละ", img: IMG.end, cost: END_COST, area: END_AREA, flash: true,
        desc: `เลือกทิศ แนว 4×1 วาร์ปไปฟันศัตรูคนแรก · พลังชีวิตตัวเองเหลือ 1 · ดาเมจ ${END_DMG} (ไม่ทำให้ตาย) · ล้างบัฟเป้าทั้งหมด · ครั้งเดียวต่อเกม` };
    }
    return null;
  },
  skillCost(p, tier, base, opts = {}) {
    if (!isNoct(p)) return base;
    if (tier === "basic") return 0;
    if (tier === "secondary") return secForm(p, opts) === "heed" ? HEED_COST : RUIN_COST;
    if (tier === "ultimate") return ultForm(p) === "end" ? END_COST : UNLEASH_COST;
    return base;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isNoct(p)) return area;
    if (tier === "secondary") {
      const f = secForm(p, opts);
      if (f === "ruin") return RUIN_AREA;
      const m = /^ruin(\d)$/.exec(f);
      if (m) return { kind: "target", range: RUIN_EOS_RANGE, count: Number(m[1]), hostile: true };
      return { kind: "self" };
    }
    if (tier === "ultimate") return ultForm(p) === "end" ? END_AREA : { kind: "self" };
    return area;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isNoct(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    const f = opts.form;
    if (tier === "basic") return !!ARMS[f] && f !== s.weapon && s.swapRound !== engine.roundNumber && !s.unleash;
    if (tier === "secondary") {
      const sf = secForm(p, opts);
      if (sf === "heed") return !s.heed && !s.unleash;
      if (!s.unleash) return false;
      if (sf === "ruin") return !eosMode(engine) && ruinCd(engine, p) === 0;
      if (/^ruin\d$/.test(sf)) return eosMode(engine) && (targets || []).every((id) => foeOf(engine, p, engine.players[id]));
      return false;
    }
    if (tier === "ultimate") {
      const uf = ultForm(p);
      if (uf === "unleash") return true;
      if (uf === "end") return !s.endUsed && (targets || []).some((id) => foeOf(engine, p, engine.players[id]));
      return false;
    }
    return false;
  },
  skipsTurnQuota(p, tier) { return isNoct(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isNoct(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isNoct(p) && tier === "basic"; },
  silentFlash(p, tier) { return isNoct(p) && tier === "basic"; },
  ownsAreaHit(p, tier, opts = {}) { return isNoct(p) && (tier === "secondary" ? secForm(p, opts) !== "heed" : tier === "ultimate" && ultForm(p) === "end"); },
  skillSound() { return null; },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isNoct(p)) return "";
    const s = st(p), r = engine.roundNumber, f = tier === "secondary" ? secForm(p, opts) : tier === "ultimate" ? ultForm(p) : opts.form;
    if (tier !== "basic") s.skillTurn = turnKey(engine);
    if (tier === "basic") {
      s.weapon = f;
      s.swapRound = r;
      fx(engine, p, "arm", { weapon: f });
      engine.sfx("noct_arm");
      engine.log(`👑 ${p.name} เรียกอาวุธ ${ARMS[f].name}`);
      return ` — ${ARMS[f].name}`;
    }
    if (tier === "secondary" && f === "heed") {
      s.heed = true;
      s.heedSever = engine.severStamp();
      fx(engine, p, "heed", {});
      engine.sfx("noct_heed");
      engine.log(`👑 ${p.name} ขานรับ เหล่าราชา`);
      return "";
    }
    if (tier === "secondary") {
      const ids = [...(targets || [])];
      if (!eosMode(engine)) s.ruinReady = r + RUIN_CD;
      engine.triggerCutscene(p, CUT.ruin);
      engine.log(`⚔️ ${p.name} ทำลายให้สิ้น`);
      if (f === "ruin") engine.deferAfterCutscene(() => engine.withEffectSource(p, () => ruinPvp(engine, p, opts.dir)));
      else engine.deferAfterCutscene(() => engine.withEffectSource(p, () => ruinEos(engine, p, ids)));
      return "";
    }
    if (tier === "ultimate" && f === "unleash") {
      s.unleash = { cast: r, until: r + UNLEASH_TURNS - 1, sever: engine.severStamp(), at: engine.nextTransformCounter() };
      engine.triggerCutscene(p, CUT.unleash);
      engine.log(`👑 ${p.name} ปลดปล่อยพลังที่แท้จริง (${UNLEASH_TURNS} เทิร์น)`);
      return "";
    }
    if (tier === "ultimate" && f === "end") {
      s.endUsed = true;
      const foes = foesInLine(engine, p, opts.dir, END_AREA.len);
      const t = foes.length ? foes[0].u : null;
      p.hp = 1; // ลดพลังชีวิตตัวเองเหลือ 1 (แม้เป้าหลบ)
      if (t) {
        const land = landNear(engine, p, t, opts.dir);
        if (land) teleport(engine, p, land, "warp");
      }
      engine.triggerCutscene(p, CUT.end);
      engine.log(`👑 ${p.name} ให้มันจบตรงนี้แหละ`);
      if (t) engine.deferAfterCutscene(() => engine.withEffectSource(p, () => { endItHere(engine, p, [t.id]); engine.hitArea(p, [{ ...t.pos || p.pos }], [t.id]); }));
      return "";
    }
    return "";
  },

  // ---------- ปุ่ม HUD ----------
  hudActions(engine, p) {
    if (!isNoct(p) || !p.alive || !p.pos) return undefined;
    const w = warpReady(engine, p), wt = w ? warpTiles(engine, p) : [];
    const pt = pointReady(engine, p) ? pointTiles(engine, p) : [];
    return [
      { key: "warp", icon: "🗡️", name: "Warp Strike", tiles: wt, disabled: !wt.length },
      { key: "point", icon: "🌀", name: "Warp Point", tiles: pt, disabled: !pt.length, on: st(p).dodge },
    ];
  },
  charAction(engine, p, key, opts = {}) {
    if (!isNoct(p)) return false;
    if (key === "warp") return warpStrike(engine, p, opts.tile);
    if (key === "point") return warpPoint(engine, p, opts.tile);
    return false;
  },

  skillMusic(engine, p) {
    if (!isNoct(p) || !p.alive || !st(p).unleash) return null;
    return { music: MUSIC.unleash, at: st(p).unleash.at || 0 };
  },
  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isNoct(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.unleash) out.push({ key: "unleash", label: "ปลดปล่อยพลังที่แท้จริง", at: s.unleash.sever || 0, cancel: () => { s.unleash = null; } });
    if (s.heed) out.push({ key: "heed", label: "ขานรับ เหล่าราชา", at: s.heedSever || 0, cancel: () => { s.heed = false; } });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  noctState(engine, p) {
    if (!isNoct(p)) return undefined;
    const s = st(p), r = engine.roundNumber, h = s.heart;
    const name = (id) => (engine.players[id] || {}).name || "";
    return {
      weapon: s.weapon, heed: s.heed, swapped: s.swapRound === r, dodge: s.dodge,
      unleashLeft: s.unleash ? Math.max(1, s.unleash.until - r + 1) : 0,
      heart: h && h.deciding ? { victim: name(h.victimId), attacker: name(h.attackerId) } : null,
    };
  },
  skillLocks(engine, p) {
    if (!isNoct(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: s.swapRound === engine.roundNumber || !!s.unleash },
      secondary: s.unleash ? { cd: ruinCd(engine, p), locked: ruinCd(engine, p) > 0 } : { locked: s.heed },
      ultimate: { locked: !!s.unleash && s.endUsed },
    };
  },
};

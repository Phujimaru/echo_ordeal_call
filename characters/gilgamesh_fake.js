// ============================================================
//  กิลกาเมช (Fake) — มหันตภัย · unique (GRID_PLAN §7.30 · ผู้ใช้ส่งสเปก + ตัดสิน 2026-11-09 · "โกงและสมเป็นราชาที่สุด")
//
//  จงเห่าหอนซะสิ เจ้าพันธุ์ทาง (0 · ปุ่ม 2 ตัวเลือก — สลับฟรี ไม่กินโควตา เดินต่อได้ เทิร์นละครั้ง):
//   มือเปล่า = ศัตรูโจมตีใส่ 30% ไอเทมในคลังโผล่มากัน (การโจมตีทั้งก้อน 0 · ไอเทมพัง) + โซ่เอนคิดูตรึงผู้โจมตี 1 เทิร์น
//   ดาบ EA  = ตีปกติรอบตัว 8 ช่อง (ฮุค strikeRing) ดาเมจ 3 ตายตัว ผลักออก 1 · ตีด้วย EA แล้ว = พายุ (ฝน + สายฟ้าแดงผ่าศัตรูทุกจบเทิร์น จนเก็บ EA)
//  เมตตาจากราชา (0 · มือเปล่า): ยิงไอเทมแบบปืนกล N นัด ในกรอบ N×N รอบตัว — สุ่มศัตรูทีละนัด (ต่อนัด = 1 จังหวะ engine.skillBeat)
//   นัดละ 1 ดาเมจ ลดเกราะก่อน หลบได้ · ความมั่งคั่ง +1/นัด · โดน 3 นัดขึ้นไป = คุกเข่า (สตั้น) · อาวุธปักค้างจนต้นเทิร์นถัดไป
//  Enuma Elish (ความมั่งคั่ง 30 · ถือ EA): แนว 5 กว้างสุดแผนที่ · ยิงต้นตาเดินถัดไป (onActorReady แบบเกรย์) · แม่นยำ + ตายแน่นอน
//  ติดตัว: เริ่ม 100 เหรียญ (เพดาน 999) · ร้านรีสต็อกทุก 2 เทิร์น · กระเป๋า 50 ช่อง · ซื้อจากระยะไกล (ฮุค remoteShop)
//
//  เอฟเฟกต์ client: socket "gilFx" { kind, id, ... } → client/src/board/gilFx.js · สถานะ players[].gil (gilState)
// ============================================================
const Board = require("../server/board");

const ID = "gilgamesh_fake";
const DIR = "/characters/gilgamesh_fake";
const IMG = {
  base: `${DIR}/gilgamesh.webp`,
  skill1: `${DIR}/skill1.webp`,
  skill2: `${DIR}/skill2.webp`,
  skill3: `${DIR}/skill3.webp`,
};
const VIDEO = { draw: `${DIR}/gil_ea_draw.mp4`, roar: `${DIR}/gil_ea_roar.mp4`, gate: `${DIR}/gil_gate.mp4`, enuma: `${DIR}/gil_enuma.mp4` };
const CUT = { draw: "gilEaDraw", roar: "gilEaRoar", gate: "gilGate", enuma: "gilEnuma" };
const MUSIC = { charge: "gil_bite_down", storm: "gil_strange_fake" }; // client/src/audio.js
// เสียงสังเคราะห์ (client/src/audio.js — /characters/gilgamesh_fake/sfx)
const SFX = {
  equip: "gil_equip", unequip: "gil_unequip", gate: "gil_gate", shot: "gil_shot", shotBig: "gil_shot_big",
  ea: "gil_ea_slash", thunder: "gil_thunder", block: "gil_block", chain: "gil_chain", charge: "gil_enuma_charge", enuma: "gil_enuma_fire",
  dissolve: "gil_dissolve", kneel: "gil_kneel",
};

const MAX_HP = 8; // Claude (ผู้ใช้: "โกงที่สุด")
const GOLD_START = 100;
const GOLD_CAP = 999;
const BAG = 50;
const RESTOCK_TURNS = 2;
const WEALTH_MAX = 30;
const ULT_WEALTH = 30;
const BLOCK_PCT = 30;
const ROOT_TURNS = 1;
const EA_DMG = 3;
const BOLT_DMG = 2;
const SHOT_DMG = 1;
const KNEEL_HITS = 3;
const ZONE_MAX = 14;
const ULT_AREA = { kind: "line", len: 14, width: 5, hostile: true };
// ของที่ไม่ใช่สมบัติสำหรับยิง/กัน (ของถาวร/ชาร์จ/ประจำตัวละคร)
const NON_AMMO = ["battery", "lifeCrystal", "armorCrystal", "kebread", "lawHeart", "giornoArrow"];
// จังหวะ (วินาที) — ต้องตรงกับ client/src/board/gilFx.js GIL_T
const GATE_OPEN = 1.1;
const SHOT_FIRST = 0.34;
const SHOT_MIN = 0.075;
const SHOT_DECAY = 0.84;
const SHOT_TAIL = 1.1;
const ENUMA_HIT = 3.25; // เสียงจากวีดีโอผู้ใช้: "Enuma Elish!" 0–2.2 วิ → เว้นจังหวะ → ลำแสง + เสียงระเบิดที่ 3.25 วิ
const ENUMA_TAIL = 6.0; // เสียงครืนของลำแสงยาวถึง ~10.9 วิ (client หรี่เสียงอื่นทั้งหมดระหว่างนี้ — audio.js FOCUS_SFX)
const EA_PUSH_HOLD = 0.6;

const isGil = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    ea: false, swapRound: -1, wealth: 0,
    gateShown: false, roarShown: false,
    storm: false, warns: [], weapons: [], wSeq: 0,
    charge: null, volley: null,
    blockKey: null, hitKey: null, restockRound: null,
  };
}
function st(p) { return p.gil || (p.gil = fresh()); }
const eaOn = (p) => isGil(p) && st(p).ea;
const nextTurnSpan = (engine, t, n = 1) => n + (engine.hasActed(t.id) || engine.actorId === t.id ? 1 : 0);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ammoOf = (p) => (p.inventory || []).filter((it) => it && !NON_AMMO.includes(it.type));
const fx = (engine, p, kind, extra = {}) => engine.boardFx("gilFx", { kind, id: p.id, at: p.pos ? { ...p.pos } : null, ...extra });
const foeOf = (engine, p, t) => !!t && t.alive && !!t.pos && t.id !== p.id && !engine.sameTeam(p, t) && engine.dim.same(p, t);

// ระยะทแยง (เชบีเชฟ) ระหว่างขอบสองกล่อง — 1 = ติดกันรวมแนวทแยง
function chebGap(a, b) {
  const as = Math.max(1, a.size | 0), bs = Math.max(1, b.size | 0);
  const W = Board.wrapCols();
  let dx;
  if (W) {
    const f = ((b.x - a.x) % W + W) % W, r = ((a.x - b.x) % W + W) % W;
    dx = Math.min(Math.max(0, f - (as - 1)), Math.max(0, r - (bs - 1)));
  } else dx = Math.max(0, a.x - (b.x + bs - 1), b.x - (a.x + as - 1));
  const dy = Math.max(0, a.y - (b.y + bs - 1), b.y - (a.y + as - 1));
  return Math.max(dx, dy);
}
// ช่องรอบตัว 8 ช่อง (ตัวใหญ่ = วงรอบกล่อง) ที่อยู่ในกระดาน
function ringTiles(engine, p) {
  if (!p.pos) return [];
  const map = engine.boardMap(), n = engine.sizeOf(p), out = [];
  for (let y = p.pos.y - 1; y <= p.pos.y + n; y++) for (let x = p.pos.x - 1; x <= p.pos.x + n; x++) {
    if (x >= p.pos.x && x < p.pos.x + n && y >= p.pos.y && y < p.pos.y + n) continue;
    if (y < 0 || y >= map.rows) continue;
    const xx = Board.wx(x);
    if (!Board.wrapCols() && (xx < 0 || xx >= map.cols)) continue;
    out.push({ x: xx, y });
  }
  return out;
}
const onTiles = (t, set) => Board.footprint(t.pos.x, t.pos.y, Math.max(1, t.boardSize | 0)).some((c) => set.has(Board.key(c.x, c.y)));

// ---------- กรอบยิง N×N (กึ่งกลางที่กิล · เลื่อนให้อยู่ในกระดาน · Colony วนแกน x) ----------
function zoneOf(engine, p, n) {
  const map = engine.boardMap(), side = Math.max(1, Math.min(ZONE_MAX, n | 0));
  const half = Math.floor((side - 1) / 2);
  let x0 = p.pos.x - half, y0 = p.pos.y - half;
  if (!Board.wrapCols()) x0 = Math.max(0, Math.min(map.cols - side, x0));
  y0 = Math.max(0, Math.min(map.rows - side, y0));
  const tiles = [];
  for (let y = y0; y < y0 + side; y++) for (let x = x0; x < x0 + side; x++) tiles.push({ x: Board.wx(x), y });
  return { x0: Board.wx(x0), y0, side, tiles };
}
function foesIn(engine, p, tiles) {
  const set = new Set(tiles.map((t) => Board.key(t.x, t.y)));
  return Object.values(engine.players).filter((t) => foeOf(engine, p, t) && onTiles(t, set));
}
// ตัวเลือกจำนวน: 1..min(กระสุน, 14) + "ทั้งคลัง" เมื่อกระสุนเกิน 14
function countOptions(p) {
  const ammo = ammoOf(p).length, out = [];
  for (let n = 1; n <= Math.min(ammo, ZONE_MAX); n++) out.push({ key: `n${n}`, n });
  if (ammo > ZONE_MAX) out.push({ key: "all", n: ammo, all: true });
  return out;
}
const countOfForm = (p, form) => {
  const ammo = ammoOf(p).length;
  if (form === "all") return ammo;
  const n = Number(String(form || "").replace(/^n/, ""));
  return Number.isInteger(n) && n > 0 ? Math.min(n, ammo, ZONE_MAX) : 0;
};

// ---------- ตาย/ดาเมจจากสกิลของกิล (นอกท่อ skillStrike — ต้องจัดการคนตายเอง) ----------
function hurt(engine, p, t, n, reason) {
  t.wasAttacked = true;
  if (engine.skillDodge(p, t, reason)) return { dodge: true };
  const amt = n + (engine.statusAmtOf(t, "fragile") || 0);
  const before = (t.hp || 0) + (t.armor || 0);
  engine.dealMixed(t, amt);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  const dealt = Math.max(0, before - ((t.hp || 0) + (t.armor || 0)));
  const kill = !t.alive;
  if (kill) { t.pos = null; engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`); }
  return { dodge: false, dealt, kill };
}
function addWealth(p, n) { const s = st(p); s.wealth = Math.min(WEALTH_MAX, s.wealth + n); }

// ---------- โซ่เอนคิดู (ตรึง 1 เทิร์น — เป้าที่เดินไปแล้วได้ผลเทิร์นหน้า) ----------
function chain(engine, p, t) {
  if (!t || !t.alive || !t.pos) return false;
  fx(engine, p, "chain", { to: { ...t.pos }, tid: t.id });
  engine.sfx(SFX.chain);
  if (engine.applyDebuff(t, "rooted", 1, nextTurnSpan(engine, t, ROOT_TURNS))) {
    engine.log(`⛓️ โซ่เอนคิดูมัด ${t.name} — เดินไม่ได้ ${ROOT_TURNS} เทิร์น`);
    return true;
  }
  engine.log(`⛓️ ${t.name} ต้านโซ่เอนคิดูไว้ได้`);
  return false;
}

// ---------- พายุ (ถือ EA หลังตีด้วย EA) ----------
function warnAll(engine, p) {
  const s = st(p);
  s.warns = Object.values(engine.players).filter((t) => foeOf(engine, p, t)).map((t) => ({ id: t.id, x: t.pos.x, y: t.pos.y }));
}
function startStorm(engine, p) {
  const s = st(p);
  if (s.storm) return;
  s.storm = true;
  s.stormSever = engine.severStamp();
  s.stormAt = engine.nextTransformCounter(); // เพลง STRANGEFAKE เริ่มใหม่
  warnAll(engine, p);
  fx(engine, p, "storm", {});
  engine.log(`⛈️ ${p.name} ปลุกพายุของ EA — สายฟ้าแดงเล็งศัตรูทุกคน`);
}
function endStorm(engine, p) {
  const s = st(p);
  if (!s.storm) return;
  s.storm = false;
  s.warns = [];
  fx(engine, p, "calm", {});
  engine.log(`🌤️ พายุของ ${p.name} สงบลง`);
}
function stormStrike(engine, p) {
  const s = st(p);
  const warns = s.warns.slice();
  s.warns = [];
  if (!warns.length) return;
  const bolts = [];
  engine.withEffectSource(p, () => {
    for (const w of warns) {
      const set = new Set([Board.key(w.x, w.y)]);
      const victims = Object.values(engine.players).filter((t) => foeOf(engine, p, t) && onTiles(t, set));
      const res = victims.map((t) => ({ id: t.id, ...hurt(engine, p, t, BOLT_DMG, "สายฟ้าแดง") }));
      for (const r of res) {
        const t = engine.players[r.id];
        engine.log(r.dodge ? `💨 ${t.name} หลบสายฟ้าแดงได้` : `⚡ สายฟ้าแดงผ่า ${t.name} -${r.dealt}`);
      }
      bolts.push({ x: w.x, y: w.y, hit: res.some((r) => !r.dodge), ids: res.map((r) => r.id) });
    }
  });
  fx(engine, p, "bolts", { bolts });
  engine.sfx(SFX.thunder);
}

// ---------- เมตตาจากราชา (ปืนกลจากประตูบาบิโลน) ----------
function shotGap(i) { return i < 3 ? SHOT_FIRST : Math.max(SHOT_MIN, SHOT_FIRST * Math.pow(SHOT_DECAY, i - 2)); }
function startVolley(engine, p) {
  const s = st(p), v = s.volley;
  if (!v || !p.alive || !p.pos) { s.volley = null; return; }
  fx(engine, p, "gate", { n: v.n, zone: { x0: v.zone.x0, y0: v.zone.y0, side: v.zone.side }, seq: v.seq });
  engine.sfx(SFX.gate);
  engine.skillBeat(GATE_OPEN, () => queueShot(engine, p, 0));
}
function queueShot(engine, p, i) {
  const s = st(p), v = s.volley;
  if (!v) return;
  if (!fireShot(engine, p, i)) { endVolley(engine, p); return; }
  if (i + 1 >= v.n) { engine.skillBeat(SHOT_TAIL, () => endVolley(engine, p)); return; }
  engine.skillBeat(shotGap(i), () => queueShot(engine, p, i + 1));
}
// ยิง 1 นัด → false = หยุด (ไม่มีศัตรูในกรอบ / ไม่มีกระสุน / กิลไม่อยู่)
function fireShot(engine, p, i) {
  const s = st(p), v = s.volley;
  if (!p.alive || !p.pos) return false;
  const foes = foesIn(engine, p, v.zone.tiles);
  const ammo = ammoOf(p);
  if (!foes.length || !ammo.length) return false;
  const t = pick(foes), item = pick(ammo);
  p.inventory.splice(p.inventory.indexOf(item), 1);
  addWealth(p, 1);
  v.fired++;
  const big = i + 1 >= v.n;
  const r = hurt(engine, p, t, SHOT_DMG, "เมตตาจากราชา");
  if (!r.dodge) v.hits[t.id] = (v.hits[t.id] || 0) + 1;
  v.hitIds.add(t.id);
  // อาวุธปักลงพื้น: โดน = ช่องของเป้า · หลบ = ช่องข้างๆ (สุ่ม — ในกระดาน)
  const at = t.pos ? { ...t.pos } : r.kill && v.lastPos[t.id] ? v.lastPos[t.id] : null;
  const spot = at || { x: p.pos.x, y: p.pos.y };
  let land = spot;
  if (r.dodge) {
    const map = engine.boardMap();
    const opts = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      .map(([dx, dy]) => ({ x: Board.wx(spot.x + dx), y: spot.y + dy }))
      .filter((c) => c.y >= 0 && c.y < map.rows && c.x >= 0 && c.x < map.cols);
    land = pick(opts) || spot;
  }
  if (t.pos) v.lastPos[t.id] = { ...t.pos };
  const w = { x: land.x, y: land.y, k: ++s.wSeq, w: Math.floor(Math.random() * 6), big };
  s.weapons.push(w);
  fx(engine, p, "shot", { i, n: v.n, to: { ...spot }, land: { x: land.x, y: land.y }, tid: t.id, hit: !r.dodge, kill: !!r.kill, big, w: w.w, k: w.k, item: item.type, seq: v.seq });
  engine.sfx(big ? SFX.shotBig : SFX.shot);
  if (!r.dodge) engine.log(`🗡️ ${shopName(engine, item)} พุ่งใส่ ${t.name} -${r.dealt}`);
  else engine.log(`💨 ${t.name} หลบ ${shopName(engine, item)} ได้`);
  return true;
}
const shopName = (engine, item) => engine.shopItemName(item);
function endVolley(engine, p) {
  const s = st(p), v = s.volley;
  if (!v) return;
  s.volley = null;
  // คุกเข่า: โดน 3 นัดขึ้นไปในชุดเดียว = สตั้น 1 เทิร์น (ต้านได้)
  const knelt = [];
  for (const [tid, n] of Object.entries(v.hits)) {
    const t = engine.players[tid];
    if (n < KNEEL_HITS || !t || !t.alive || !t.pos) continue;
    if (engine.applyDebuff(t, "stun", null, nextTurnSpan(engine, t))) {
      knelt.push(t.id);
      engine.log(`🙇 ${t.name} คุกเข่าต่อหน้าราชา — สตั้น 1 เทิร์น`);
    } else engine.log(`🙇 ${t.name} ต้านการคุกเข่าไว้ได้`);
  }
  engine.hitArea(p, v.zone.tiles, [...v.hitIds]);
  fx(engine, p, "volleyEnd", { fired: v.fired, knelt, seq: v.seq, wealth: s.wealth });
  if (knelt.length) engine.sfx(SFX.kneel);
  engine.log(`👑 ${p.name} เมตตาจากราชา ×${v.fired} — ความมั่งคั่ง ${s.wealth}/${WEALTH_MAX}`);
}

// ---------- Enuma Elish ----------
function beamTiles(engine, p, dir) { return engine.areaTiles(p, ULT_AREA, dir); }
function fireEnuma(engine, p) {
  const s = st(p), c = s.charge;
  s.charge = null;
  if (!c || !p.alive || !p.pos) return;
  engine.applyBuff(p, "accurate", null, 1);
  const tiles = beamTiles(engine, p, c.dir);
  fx(engine, p, "enuma", { dir: c.dir, tiles, size: engine.sizeOf(p), len: ULT_AREA.len, width: ULT_AREA.width });
  engine.sfx(SFX.enuma);
  engine.log(`🌌 ${p.name} Enuma Elish!`);
  engine.skillBeat(ENUMA_HIT, () => enumaHit(engine, p, tiles));
  engine.pausePlayingForCutscene();
}
function enumaHit(engine, p, tiles) {
  const set = new Set(tiles.map((t) => Board.key(t.x, t.y)));
  const victims = Object.values(engine.players).filter((t) => foeOf(engine, p, t) && onTiles(t, set));
  const ids = victims.map((t) => t.id);
  engine.withEffectSource(p, () => {
    for (const t of victims) {
      t.wasAttacked = true;
      engine.instantDeath(t, "absolute");
      if (!t.alive) { t.pos = null; engine.log(`🌌 ${t.name} ถูกลำแสงแห่งการแยกฟ้าดินกลืนหาย!`); }
    }
    engine.hitArea(p, tiles, ids);
  });
  // ลำแสงจาง → พื้นในแนวแตกหายไปจากโลก (ช่องพังจนเปลี่ยนภูมิภาค — ผู้ใช้ 2026-11-09) · ร้าน/ศพในแนวหาย · คนที่ยังยืนอยู่ถูกผลักออก
  engine.skillBeat(ENUMA_TAIL, () => {
    const map = engine.boardMap();
    const keys = [...set].filter((k) => !(map.terrain[k] && Board.UNBREAKABLE.has(map.terrain[k]) && map.terrain[k] !== "chasm"));
    const razed = engine.breakObstacles(keys);
    const hitShops = engine.razeShopsIn(set);
    if (hitShops.length) engine.log("🏪 ร้านค้าในแนวลำแสงพังทลาย");
    for (const o of Object.values(engine.players)) if (!o.alive && o.corpse && set.has(Board.key(o.corpse.x, o.corpse.y))) o.corpse = null;
    const fresh2 = engine.addChasm(keys);
    const pushes = [];
    for (const o of Object.values(engine.players)) {
      if (!o.alive || !o.pos || o.id === p.id || !onTiles(o, set)) continue;
      const from = { ...o.pos };
      o.pos = null;
      const to = engine.nearFreeTile(from);
      o.pos = to || from;
      if (to) pushes.push({ id: o.id, from, to: { ...to }, dir: c0dir(from, to) });
    }
    engine.boardFx("ryougiFx", {
      kind: "crumble", id: p.id, color: engine.colorOf(p), at: p.pos ? { ...p.pos } : tiles[0], size: engine.sizeOf(p),
      dir: "down", land: p.pos ? { ...p.pos } : tiles[0],
      tiles: fresh2.map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }),
      pushes, razed: razed.map((r) => ({ x: r.x, y: r.y, kind: r.kind })), shop: null, step: 4,
    });
    engine.log(`🌍 Enuma Elish — พื้น ${fresh2.length} ช่องแตกหายไปจากโลก`);
    const moves = pushes.map((m) => ({ id: m.id, via: m.from, to: m.to, dir: m.dir }));
    if (moves.length) engine.ice.forcedSlides(moves, p);
    engine.skillBeat(2.2, () => {});
  });
}
const c0dir = (a, b) => (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x >= a.x ? "right" : "left") : (b.y >= a.y ? "down" : "up"));

module.exports = {
  id: ID,
  IMG, VIDEO, CUT, SFX, MUSIC, GOLD_START, GOLD_CAP, BAG, RESTOCK_TURNS, WEALTH_MAX, ULT_WEALTH, BLOCK_PCT, EA_DMG, BOLT_DMG, SHOT_DMG,
  KNEEL_HITS, ZONE_MAX, ULT_AREA, NON_AMMO, GATE_OPEN, SHOT_TAIL, ENUMA_HIT, ENUMA_TAIL,
  isGil, ammoOf, zoneOf, countOptions, shotGap,

  resetCombat(p) {
    p.gil = isGil(p) ? fresh() : null;
    if (isGil(p)) p.gold = GOLD_START; // ราชาที่แท้จริง: เริ่มเกม 100 เหรียญ
  },
  maxHp() { return MAX_HP; },
  // ---------- ราชาที่แท้จริง / Gate of Babylon ----------
  goldCap(p) { return isGil(p) ? GOLD_CAP : null; },
  bagSlots(p) { return isGil(p) ? BAG : null; },
  remoteShop(p) { return isGil(p); },
  onRoundStartTick(engine, p) {
    if (!isGil(p) || !p.alive) return;
    const s = st(p);
    // อาวุธที่ปักค้างจากเทิร์นก่อน = สลายเป็นละอองทอง
    if (s.weapons.length) {
      fx(engine, p, "dissolve", { weapons: s.weapons.map((w) => ({ x: w.x, y: w.y, k: w.k })) });
      engine.sfx(SFX.dissolve);
      s.weapons = [];
    }
    // ร้านค้ารีสต็อกทุก 2 เทิร์น (ทุกร้าน · ทุกคนได้ประโยชน์)
    const r = engine.roundNumber;
    if (engine.restockShops && (s.restockRound == null || r - s.restockRound >= RESTOCK_TURNS)) {
      if (s.restockRound != null && engine.restockShops()) engine.log(`👑 ราชาสั่งเติมสินค้า — ร้านค้าทุกร้านรีสต็อกใหม่`);
      s.restockRound = r;
    }
  },

  // ---------- ตีปกติ ----------
  range(p) { return eaOn(p) ? [1, 2] : null; },
  strikeRing(p) { return eaOn(p); },
  strikeAllows(p, target) {
    if (!eaOn(p) || !p.pos || !target || !target.pos) return true;
    return chebGap(Board.boxOf(p), Board.boxOf(target)) === 1;
  },
  ringTiles(engine, p) { return ringTiles(engine, p); },
  fixedStrikeDamage(engine, attacker) { return eaOn(attacker) ? EA_DMG : null; },
  attackStyle(p) { return eaOn(p) ? "gilEa" : null; },
  attackSound(p) { return eaOn(p) ? SFX.ea : undefined; },
  preAttackClip(engine, attacker) {
    if (!eaOn(attacker)) return null;
    const s = st(attacker);
    if (s.roarShown) return null;
    s.roarShown = true;
    return CUT.roar;
  },
  // ตีด้วย EA: ศัตรูรอบตัวทุกคนถูกผลักออก 1 ช่อง (ทแยงได้) → พายุเริ่ม
  afterBoardAttack(engine, attacker) {
    if (!eaOn(attacker)) return null;
    return () => {
      if (!attacker.alive || !attacker.pos) return 0;
      const ring = new Set(ringTiles(engine, attacker).map((t) => Board.key(t.x, t.y)));
      const foes = Object.values(engine.players).filter((t) => foeOf(engine, attacker, t) && onTiles(t, ring));
      const ctx = engine.ice.begin();
      engine.withEffectSource(attacker, () => {
        for (const t of foes) {
          const dx = Math.sign(Board.wdx(attacker.pos.x, t.pos.x)), dy = Math.sign(t.pos.y - attacker.pos.y);
          engine.ice.pushUnit(t, { x: dx, y: dy }, ctx, 1);
        }
      });
      engine.ice.flush(ctx);
      startStorm(engine, attacker);
      return EA_PUSH_HOLD;
    };
  },

  // ---------- มือเปล่า: สมบัติโผล่มากัน + โซ่เอนคิดู ----------
  onAttacked(engine, p, attacker) {
    if (!isGil(p) || !p.alive || st(p).ea) return;
    const s = st(p), key = `${attacker.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
    if (s.blockKey === key || s.hitKey === key) return;
    const ammo = ammoOf(p);
    if (!ammo.length || Math.random() * 100 >= BLOCK_PCT) { s.hitKey = key; return; }
    s.blockKey = key;
    const item = pick(ammo);
    p.inventory.splice(p.inventory.indexOf(item), 1);
    fx(engine, p, "block", { item: item.type, from: attacker.pos ? { ...attacker.pos } : null });
    engine.sfx(SFX.block);
    engine.log(`🛡️ ${engine.shopItemName(item)} โผล่จากประตูบาบิโลนกันการโจมตีของ ${attacker.name} แล้วพังไป`);
    chain(engine, p, attacker);
  },
  blocksAttack(engine, p, attacker) {
    if (!isGil(p) || st(p).ea) return null;
    const key = `${attacker.id}|${engine.roundNumber}|${engine.actorId || ""}|${engine.commandSeq}`;
    return st(p).blockKey === key ? { name: "Gate of Babylon", img: IMG.skill2 } : null;
  },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isGil(p)) return null;
    const s = st(p);
    if (tier === "basic") {
      return {
        choices: [
          { key: "bare", name: "มือเปล่า", img: IMG.base, desc: "30% ไอเทมในคลังโผล่มากันการโจมตีทั้งก้อนแล้วพัง · โซ่เอนคิดูตรึงผู้โจมตี 1 เทิร์น", area: { kind: "self" }, cost: 0, free: true, active: !s.ea, locked: !!s.charge },
          { key: "ea", name: "ดาบ EA", img: IMG.skill3, desc: "ตีปกติรอบตัว 8 ช่อง ดาเมจ 3 ผลักออก 1 · ตีแล้วเกิดพายุสายฟ้าแดงจนกว่าจะเก็บดาบ", area: { kind: "self" }, cost: 0, free: true, active: s.ea },
        ],
      };
    }
    if (tier === "secondary") {
      const engine = require("../server/engine").engine;
      const map = p.pos ? engine.boardMap() : null;
      return {
        choices: countOptions(p).map((o) => {
          const z = p.pos ? zoneOf(engine, p, o.n) : null;
          const side = Math.min(o.n, ZONE_MAX);
          return {
            key: o.key, name: o.all ? `ทั้งคลัง ×${o.n}` : `×${o.n}`, img: IMG.skill2, cost: 0, area: { kind: "self" },
            desc: `ยิง ${o.n} นัด ในกรอบ ${side}×${side}`,
            zone: z && map ? { x0: z.x0, y0: z.y0, side: z.side, cols: map.cols, rows: map.rows, gx: p.pos.x, gy: p.pos.y } : null,
            locked: !!s.ea || !z || !foesIn(engine, p, z.tiles).length,
          };
        }),
      };
    }
    return null;
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isGil(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    if (tier === "basic") {
      if (opts.form !== "ea" && opts.form !== "bare") return false;
      if ((opts.form === "ea") === s.ea) return false;
      if (s.swapRound === engine.roundNumber) return false;
      if (opts.form === "bare" && s.charge) return false; // ระหว่างชาร์จ Enuma Elish เก็บ EA ไม่ได้
      return true;
    }
    if (tier === "secondary") {
      if (s.ea || s.volley) return false;
      const n = countOfForm(p, opts.form);
      if (!n) return false;
      return foesIn(engine, p, zoneOf(engine, p, n).tiles).length > 0;
    }
    if (tier === "ultimate") return s.ea && !s.charge && s.wealth >= ULT_WEALTH && !!opts.dir;
    return false;
  },
  skipsTurnQuota(p, tier) { return isGil(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isGil(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isGil(p) && (tier === "basic" || tier === "secondary"); },
  ownsAreaHit(p, tier) { return isGil(p) && (tier === "secondary" || tier === "ultimate"); },
  silentFlash(p, tier) { return isGil(p) && tier === "basic"; },
  skillSound(p, tier) {
    if (!isGil(p)) return null;
    if (tier === "secondary") return null; // ประตูเปิด = เสียงจากฉาก (startVolley) · ครั้งแรกมีคลิป
    if (tier === "ultimate") return null; // คลิป EAชาร์จ / การ์ดแจ้งเตือน + เสียงชาร์จ
    return null; // สลับดาบ: เสียงจาก applyInstantSkill (ครั้งแรกมีคลิป — ห้ามเสียงตัดหน้า)
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isGil(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      s.swapRound = r;
      if (opts.form === "ea") {
        s.ea = true;
        fx(engine, p, "equip", {});
        if (!p.cutsceneShown || !p.cutsceneShown[CUT.draw]) engine.triggerCutscene(p, CUT.draw);
        else engine.sfx(SFX.equip);
        engine.log(`🗡️ ${p.name} ชักดาบ EA จากประตูบาบิโลน`);
      } else {
        s.ea = false;
        endStorm(engine, p);
        fx(engine, p, "unequip", {});
        engine.sfx(SFX.unequip);
        engine.log(`👑 ${p.name} เก็บดาบ EA`);
      }
      return "";
    }
    if (tier === "secondary") {
      const n = countOfForm(p, opts.form);
      const z = zoneOf(engine, p, n);
      s.volley = { n, zone: z, fired: 0, hits: {}, hitIds: new Set(), lastPos: {}, seq: engine.nextTransformCounter() };
      if (!s.gateShown) {
        s.gateShown = true;
        engine.queueCutscene(p, CUT.gate);
        engine.deferAfterCutscene(() => startVolley(engine, p));
      } else startVolley(engine, p);
      return ` ×${n}`;
    }
    if (tier === "ultimate") {
      s.wealth -= ULT_WEALTH;
      s.charge = { dir: opts.dir, cast: r, fire: r + 1, sever: engine.severStamp(), at: engine.nextTransformCounter() };
      fx(engine, p, "charge", { dir: opts.dir, tiles: beamTiles(engine, p, opts.dir) });
      if (!p.cutsceneShown || !p.cutsceneShown[CUT.enuma]) engine.triggerCutscene(p, CUT.enuma);
      else engine.sfx(SFX.charge);
      engine.log(`🌌 ${p.name} หมุนดาบ EA — Enuma Elish ยิงเทิร์นที่ ${s.charge.fire}`);
      return "";
    }
    return "";
  },
  // ต้นตาเดินของกิล: ถึงเวลายิง Enuma Elish
  onActorReady(engine, p) {
    if (!isGil(p)) return;
    const s = st(p);
    if (s.charge && engine.roundNumber >= s.charge.fire) fireEnuma(engine, p);
  },
  onEndTurn(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isGil(p)) continue;
      const s = st(p);
      if (!p.alive) continue;
      if (s.storm && s.ea) { stormStrike(engine, p); if (p.alive && s.storm) warnAll(engine, p); }
      // ถูกข้ามตา (สตั้น/หลับ) ในเทิร์นที่ต้องยิง = เลื่อนไปเทิร์นหน้า
      if (s.charge && engine.roundNumber >= s.charge.fire) {
        s.charge.fire = engine.roundNumber + 1;
        engine.log(`🌌 Enuma Elish ของ ${p.name} ยังรอปล่อย`);
      }
    }
  },
  onDeath(engine, p) {
    if (!isGil(p)) return;
    const s = st(p);
    if (s.charge) engine.log(`🌌 Enuma Elish ของ ${p.name} สลายไป`);
    s.charge = null;
    s.storm = false;
    s.warns = [];
    s.volley = null;
  },
  onBoardPlaced(engine) {
    for (const p of Object.values(engine.players)) {
      if (!isGil(p)) continue;
      const s = st(p);
      s.weapons = [];
      if (s.storm) warnAll(engine, p);
    }
  },

  // ---------- เพลง (view.activeSkillMusic — at มากสุดชนะ) ----------
  //  ชาร์จ Enuma Elish = bite down · พายุของ EA = STRANGEFAKE (ไฟล์จากผู้ใช้ 2026-11-09)
  skillMusic(engine, p) {
    if (!isGil(p) || !p.alive) return null;
    const s = st(p);
    if (s.charge) return { music: MUSIC.charge, at: s.charge.at };
    if (s.storm) return { music: MUSIC.storm, at: s.stormAt || 0 };
    return null;
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isGil(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.charge) out.push({ key: "enuma", label: "Enuma Elish", at: s.charge.sever || 0, cancel: () => { s.charge = null; engine.log(`🌌 Enuma Elish ของ ${p.name} สลายไป`); } });
    if (s.storm) out.push({ key: "storm", label: "พายุของ EA", at: s.stormSever || 0, cancel: () => endStorm(engine, p) });
    return out;
  },

  // ---------- ข้อมูลให้ client ----------
  gilState(engine, p) {
    if (!isGil(p)) return undefined;
    const s = st(p), r = engine.roundNumber, c = s.charge;
    return {
      ea: s.ea, wealth: s.wealth, wealthMax: WEALTH_MAX, ultCost: ULT_WEALTH,
      ammo: ammoOf(p).length,
      storm: s.storm, warns: s.storm ? s.warns.map((w) => ({ x: w.x, y: w.y })) : [],
      weapons: s.weapons.map((w) => ({ x: w.x, y: w.y, k: w.k, w: w.w, big: !!w.big })),
      swapped: s.swapRound === r,
      charge: c && p.pos ? { dir: c.dir, fire: c.fire, left: Math.max(0, c.fire - r), tiles: beamTiles(engine, p, c.dir) } : null,
    };
  },
  skillLocks(engine, p) {
    if (!isGil(p)) return undefined;
    const s = st(p);
    return {
      basic: { locked: s.swapRound === engine.roundNumber },
      secondary: { locked: s.ea },
      ultimate: { locked: !s.ea || !!s.charge || s.wealth < ULT_WEALTH },
    };
  },
};

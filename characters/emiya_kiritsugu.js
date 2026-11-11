// ============================================================
//  เอมิยะ คริซุงุ (Fate/Zero) — กลาง · id "emiya_kiritsugu"
//  กติกาที่ตัดสินแล้ว GRID_PLAN §7.31 · ระบบกลาง GAME_SYSTEM §53
//
//  พลังชีวิต 7 (ความจุลดลงจาก Time Alter — ฮุค maxHp) / เกราะ 3 · พลังโจมตี 1 · เดิน 4 · ตีปกติประชิด
//  คลังแสง (basic · 2 แต้ม · form "smoke" | "mine" | "bandage")
//    ระเบิดควัน: ช่องรอบตัว 8 ช่อง → ม่านควันรูป + 5 ช่อง 2 เทิร์น (match.board.smoke → special "smoke" ใน Ice.overlayOf = ซ่อนตัวแบบพุ่ม) · ยังเดินได้
//    กับดักระเบิด: ช่องรอบตัว 8 ช่องที่ไม่มีศัตรู/กับดักเดิม → ศัตรูเดินเหยียบ = หยุดตรงนั้น ความเสียหาย 3 (หลบได้ · เกราะก่อน)
//      ทุกคนเห็น (ไฟกะพริบ — boardPublic) · 3 อัน วางเพิ่มอันเก่าสุดหาย · สนาม Eos ไม่จำกัด · เปลี่ยนแผนที่/ตาย = หายหมด
//    ผ่าพันแผล: ฟื้นเกราะ 2 (ไม่เกินเกราะสูงสุด)
//  Time Alter (secondary · 2 แต้ม · form "double" | "square") — ช่วง Clock Up (server/clockUp.js) kind "alter"
//    ตาตัวเอง = useSkill · นอกตา (แทรก/เข้าร่วม) = charAction "kiri:double" / "kiri:square" (ปุ่มบน HUD — ZectHud ClockUpButton)
//    ความจุพลังชีวิต −1/−2 (ต่ำสุด 1 · ลดไม่ได้แล้วยังใช้ได้ เสียแค่แต้ม) · ตี/ใช้สกิลรวม 2/4 ครั้ง · เดิน 7 เติมใหม่ทุกครั้งที่ตี
//    คูลดาวน์ 1 เทิร์น (กดเทิร์น T → กดได้อีก T+2) · Eos: พลังโจมตี +2 ระหว่างใช้
//    สกิลระหว่าง Time Alter ไม่กินโควตา แต่นับเป็น 1 ครั้ง (countHit · ครั้งสุดท้าย = endsTurn)
//  Thompson Contender (ultimate · ยิง 0 แต้ม · แนว 6×1) — เริ่มเกมมีกระสุนพร้อมยิง · ยิงแล้วต้องเติม 4 แต้ม (ไม่กินโควตา) · 3 นัดต่อเกม
//    โดนศัตรูคนแรก: skillStrike ตามพลังโจมตี + ห้ามใช้สกิล/ผนึกพลังงาน/ผุพัง 3 เทิร์น · ไม่นับเป็นการโจมตีปกติ
//    Eos: ทุกตัวในแนว · 50% สังหาร (บอสไม่โดนสังหาร — โดนความเสียหาย+ดีบัฟแทน)
//  สกิลติดตัว: เวทย์ตะกั่ว (คริ 50% นอก Time Alter · Eos ใน Time Alter ด้วย) · อดีนาลีน (ฮุค adjustIncomingDamage เก็บความเสียหายจากศัตรู
//    ไว้ลงต้นเทิร์น round+2 — onRoundStartTick) · การเอาตัวรอดขั้นสุดยอด (ความเสียหายถึงตาย 50% กันได้ + Double Accel ฟรีตาเดินถัดไป · 1 ครั้งต่อเกม)
//
//  Claude ตัดสินเอง (ผู้ใช้ให้ใช้ค่าที่เสนอ 2026-11-11 — GRID_PLAN §7.31):
//    อดีนาลีนเลื่อนเฉพาะความเสียหายที่มีต้นตอเป็นศัตรู (ผลสนาม/ลุกไหม้ที่ไม่มีต้นตอลงทันที) · เกราะหักตอนลงจริง · สังหารทันทีไม่ถูกเลื่อน
//    การเอาตัวรอด: เช็คตอนความเสียหายจะลงจริง (รวมตอนอดีนาลีนลง) · ทอยไม่ผ่าน = ยังไม่เสียสิทธิ์ · Double Accel ฟรี (ไม่ใช้แต้ม ไม่ลดความจุ)
//    เติมกระสุนล็อกการเดินแบบสกิลปกติ · คลิปเล่นทุกครั้ง ยกเว้น reload_when_alter / skill3_hit ครั้งเดียวต่อเกม (ผู้ใช้สั่ง) (Time Alter ตามแบบ · Thompson ยิง + โดนเมื่อไม่หลบ) ไม่มีเสียงเอฟเฟกต์ซ้อน
//    ตีปกติ = ปืนกล Calico M950 (ผู้ใช้สั่ง 2026-11-11 · ระยะประชิดเดิม) · เสียงปืนกล/ควัน/วางกับดัก สังเคราะห์เอง ยังไม่มีคนฟัง · ระเบิด/เติมกระสุนใช้เสียงของดิเอโก้
// ============================================================

const ID = "emiya_kiritsugu";
const DIR = "/characters/emiya_kiritsugu";
const IMG = {
  base: `${DIR}/kiritsugu.webp`, arsenal: `${DIR}/kiri_arsenal.webp`, alter: `${DIR}/kiri_alter.webp`,
  thompson: `${DIR}/kiri_thompson.webp`, contender: `${DIR}/kiri_contender.webp`, calico: `${DIR}/kiri_calico.webp`,
};
const VIDEO = {
  double: `${DIR}/kiri_double.mp4`, square: `${DIR}/kiri_square.mp4`, shoot: `${DIR}/kiri_shoot.mp4`, hit: `${DIR}/kiri_hit.mp4`,
  alterReload: `${DIR}/kiri_alter_reload.mp4`, alterShoot: `${DIR}/kiri_alter_shoot.mp4`, // ระหว่าง Time Alter (ผู้ใช้ส่งเพิ่ม 2026-11-11: Double Accel = รีโหลด + ยิง)
};
const CUT = { double: "kiriDouble", square: "kiriSquare", shoot: "kiriShoot", hit: "kiriHit", alterReload: "kiriAlterReload", alterShoot: "kiriAlterShoot" };
const MUSIC = "kiri_alter"; // time_altersong (ผู้ใช้) — เพลงระหว่าง Time Alter (ช่วง Clock Up music)

const ARSENAL_COST = 2;
const SMOKE_TURNS = 2;
const MINE_DMG = 3;
const MINE_MAX = 3;
const BANDAGE = 2;
const ALTER_COST = 2;
const ALTER_CD = 1;
const ALTER_MOV = 7;
const ALTER = { double: { name: "Double Accel", hits: 2, hp: 1 }, square: { name: "Square Accel", hits: 4, hp: 2 } };
const EOS_ATK = 2;
const SHOTS = 3;
const RELOAD_COST = 4;
const SHOT_LEN = 6;
const DEBUFF_TURNS = 3;
const EOS_KILL = 50;
const CRIT = 50;
const ADREN_DELAY = 2;
const LAST_PCT = 50;
const MIN_MAX_HP = 1;

const ARSENAL = {
  smoke: { name: "ระเบิดควัน", desc: `โยนรอบตัว 8 ช่อง → ม่านควันรูป + 5 ช่อง อยู่ ${SMOKE_TURNS} เทิร์น ยืนในควัน = ศัตรูนอกควันมองไม่เห็น (ใช้แล้วยังเดินได้)` },
  mine: { name: "กับดักระเบิด", desc: `โยนรอบตัว 8 ช่อง (ช่องที่ไม่มีศัตรู) · ศัตรูเหยียบ = ความเสียหาย ${MINE_DMG} (หลบได้) · ทุกคนเห็นไฟกะพริบ · วางได้ ${MINE_MAX} อัน วางเพิ่ม = อันเก่าสุดหาย (สนาม Eos ไม่จำกัด)` },
  bandage: { name: "ผ่าพันแผล", desc: `ฟื้นเกราะ ${BANDAGE}` },
};
const ARSENAL_KEYS = Object.keys(ARSENAL);
const ALTER_KEYS = Object.keys(ALTER);

const Board = () => require("../server/board");
const ClockUp = () => require("../server/clockUp");
const eng = () => require("../server/engine").engine;
const isEos = () => { try { return !!require("../server/fodlan").isEos(); } catch { return false; } };

const isMe = (p) => !!p && p.characterId === ID && !p.summon;
// คลิปที่เล่นครั้งเดียวต่อเกม (ผู้ใช้สั่ง 2026-11-11: reload_when_alter · skill3_hit) — ที่เหลือเล่นทุกครั้ง
function clipOnce(engine, p, key) {
  if (p.cutsceneShown[key]) return false;
  p.cutsceneShown[key] = true;
  engine.queueCutscene(p, key);
  return true;
}
function fresh() {
  return {
    mines: [], mineSeq: 0,
    loaded: true, shots: SHOTS,
    alter: null, alterReady: 0,
    hpLost: 0,
    pending: [], landing: false,
    lastUsed: false, freeAccel: false, freeAt: 0,
  };
}
function st(p) { return p.kiri || (p.kiri = fresh()); }
const cdLeft = (ready, r) => Math.max(0, (ready || 0) - r);
const inAlter = (p) => !!ClockUp().activeMember(p) && !!st(p).alter;
const K = (x, y) => `${x},${y}`;

// ---------- ช่องรอบตัว 8 ช่อง (โยนของ) ----------
function around(engine, p, form) {
  if (!p.pos) return [];
  const B = Board(), map = engine.boardMap(), out = [];
  const foes = Object.values(engine.players).filter((u) => u.alive && u.pos && u.id !== p.id && !engine.sameTeam(p, u));
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = B.wx ? B.wx(p.pos.x + dx) : p.pos.x + dx, y = p.pos.y + dy;
      if (!B.inBounds(map, x, y) || map.terrain[K(x, y)]) continue;
      if (form === "mine") {
        if (foes.some((u) => B.covers({ x: u.pos.x, y: u.pos.y, size: engine.sizeOf(u) }, x, y))) continue;
        if (st(p).mines.some((m) => m.x === x && m.y === y)) continue;
      }
      out.push({ x, y });
    }
  }
  return out;
}
const tileIn = (list, t) => !!t && list.some((c) => c.x === t.x && c.y === t.y);

// ---------- ม่านควัน (match.board.smoke — Ice.overlayOf วางเป็น special "smoke") ----------
function laySmoke(engine, p, at) {
  const b = engine.board;
  if (!b) return 0;
  const B = Board(), map = engine.boardMap();
  b.smoke ||= {};
  let n = 0;
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const x = B.wx ? B.wx(at.x + dx) : at.x + dx, y = at.y + dy;
    if (!B.inBounds(map, x, y) || map.terrain[K(x, y)]) continue;
    b.smoke[K(x, y)] = { owner: p.id, left: SMOKE_TURNS };
    n += 1;
  }
  b.iceVer = (b.iceVer || 0) + 1;
  return n;
}
function tickSmoke(engine) {
  const b = engine.board;
  if (!b || !b.smoke) return;
  let changed = false;
  for (const [k, s] of Object.entries(b.smoke)) {
    s.left -= 1;
    if (s.left <= 0) { delete b.smoke[k]; changed = true; }
  }
  if (changed) b.iceVer = (b.iceVer || 0) + 1;
}

// ---------- กับดักระเบิด ----------
function layMine(engine, p, at) {
  const s = st(p);
  s.mines.push({ x: at.x, y: at.y, seq: ++s.mineSeq });
  if (!isEos()) while (s.mines.length > MINE_MAX) s.mines.shift();
  engine.boardFx("kiriFx", { kind: "throw", id: p.id, from: { ...p.pos }, to: { ...at }, item: "mine" });
  engine.sfx("kiri_place");
}
function explode(engine, owner, u, mine) {
  const s = st(owner);
  s.mines = s.mines.filter((m) => m !== mine);
  engine.boardFx("kiriFx", { kind: "boom", at: { x: mine.x, y: mine.y } });
  engine.sfx("diego_explode");
  engine.withEffectSource(owner, () => {
    if (engine.skillDodge(owner, u, "กับดักระเบิด")) return;
    engine.dealMixed(u, MINE_DMG, false);
    engine.log(`💣 ${u.name} เหยียบกับดักระเบิดของ ${owner.name} — ความเสียหาย ${MINE_DMG}`);
    if (u.alive && u.hp <= 0) { engine.instantDeath(u); if (!u.alive) u.pos = null; }
  });
}

// ---------- Time Alter ----------
function alterOpts(kind) {
  return { kind: "alter", secs: require("../server/constants").ACTION_TIME, max: ALTER[kind].hits, music: MUSIC };
}
function alterReadyFor(engine, p) {
  const s = st(p);
  return p.alive && cdLeft(s.alterReady, engine.roundNumber) === 0 && (p.skillPoints || 0) >= ALTER_COST
    && !((p.statuses.noskill || 0) > 0) && !engine.stuck(p);
}
// ความจุพลังชีวิตที่หักได้จริง (ต่ำสุด 1)
function payHp(engine, p, kind) {
  const s = st(p);
  const room = Math.max(0, engine.maxHpOf(p) - MIN_MAX_HP);
  const take = Math.min(room, ALTER[kind].hp);
  s.hpLost += take;
  if (p.hp > engine.maxHpOf(p)) p.hp = engine.maxHpOf(p);
  return take;
}
function beginAlter(engine, p, kind, free) {
  const s = st(p);
  s.alter = { kind, at: engine.severStamp(), free: !!free };
  const lost = free ? 0 : payHp(engine, p, kind);
  if (!free) s.alterReady = engine.roundNumber + ALTER_CD + 1;
  engine.skillFlash({ name: ALTER[kind].name, img: IMG.alter, by: p.name, color: engine.colorOf(p) });
  engine.log(`⏳ ${p.name} Time Alter — ${ALTER[kind].name}${lost ? ` (ความจุพลังชีวิต −${lost})` : ""}`);
}
function canAlterOffTurn(engine, p) {
  return isMe(p) && p.alive && !st(p).alter && alterReadyFor(engine, p) && !!engine.clockUp.canEnter(p);
}
function alterOffTurn(engine, p, kind) {
  if (!ALTER[kind] || !canAlterOffTurn(engine, p)) return false;
  if (engine.timeStop.denyPress(p)) return true;
  const how = engine.clockUp.canEnter(p);
  p.skillPoints -= ALTER_COST;
  beginAlter(engine, p, kind, false);
  engine.clockUp.enter(p, alterOpts(kind));
  // เข้าร่วม = คลิปเล่นเลย · แทรก = คลิปเล่นตอนตาพิเศษเริ่ม (onExtraTurn)
  if (how === "join") { engine.queueCutscene(p, CUT[kind]); engine.pausePlayingForCutscene(); }
  return true;
}

// ---------- Thompson Contender ----------
function shoot(engine, p, targets) {
  const s = st(p), eos = isEos(), alter = inAlter(p);
  s.loaded = false;
  s.shots = Math.max(0, s.shots - 1);
  const B = Board();
  const foes = targets.map((id) => engine.players[id])
    .filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t))
    .sort((a, b) => B.dist(p.pos, a.pos) - B.dist(p.pos, b.pos));
  const hit = eos ? foes : foes.slice(0, 1);
  const end = hit.length ? { ...hit[hit.length - 1].pos } : null, from = { ...p.pos };
  // คลิปยิงทุกครั้ง → โดนอย่างน้อย 1 = คลิปโดนต่อ · เส้นกระสุนบนกระดานหลังคลิปจบ (ไม่มีเสียงเอฟเฟกต์ซ้อนคลิป)
  engine.queueCutscene(p, alter ? CUT.alterShoot : CUT.shoot);
  engine.deferAfterCutscene(() => engine.boardFx("kiriFx", { kind: "shot", id: p.id, from, to: end }));
  let landed = false;
  for (const t of hit) {
    if (engine.skillDodge(p, t, "Thompson Contender")) continue;
    // skill3_shoot จบที่กระสุนกำลังพุ่ง → skill3_hit ต่อทันที (ไม่มีการ์ดคั่น) เมื่อไม่หลบ · คลิปยิงใน Time Alter มีจังหวะกระทบในตัว
    if (!landed) { landed = true; if (!alter) clipOnce(engine, p, CUT.hit); }
    const boss = !!(t.summon && t.summon.trait === "boss");
    if (eos && !boss && Math.random() * 100 < EOS_KILL) {
      engine.log(`🎯 ${p.name} Thompson Contender — สังหาร ${t.name}`);
      engine.instantDeath(t);
      if (!t.alive) t.pos = null;
      continue;
    }
    engine.skillStrike(p, t, "Thompson Contender", { sure: true });
    if (!t.alive) continue;
    const turns = DEBUFF_TURNS + (engine.hasActed(t.id) ? 1 : 0);
    engine.applyDebuff(t, "noskill", 1, turns);
    engine.applyDebuff(t, "manaSeal", 1, turns);
    engine.applyDebuff(t, "decay", 1, turns);
    engine.log(`🎯 ${t.name} โดน Origin Bullet — ห้ามใช้สกิล · ผนึกพลังงาน · ผุพัง ${DEBUFF_TURNS} เทิร์น`);
  }
}

// ---------- อดีนาลีน / การเอาตัวรอด ----------
function lethal(p, n, kind) {
  if (kind === "armor") return false;
  const pad = (p.shield || 0) + (kind === "direct" ? 0 : p.armor || 0);
  return n >= (p.hp || 0) + pad;
}
// ความเสียหายถึงตาย: 50% กันไว้ + Double Accel ฟรีตาเดินถัดไป (1 ครั้งต่อเกม · ทอยไม่ผ่านไม่เสียสิทธิ์)
function survive(engine, p, n, kind) {
  const s = st(p);
  if (s.lastUsed || !lethal(p, n, kind)) return false;
  if (Math.random() * 100 >= LAST_PCT) return false;
  s.lastUsed = true;
  s.freeAccel = true;
  s.freeAt = engine.severStamp();
  engine.log(`⏳ ${p.name} การเอาตัวรอดขั้นสุดยอด — รอดจากความเสียหาย ${n}`);
  return true;
}
function land(engine, p, hit) {
  const s = st(p);
  if (!p.alive) return;
  if (survive(engine, p, hit.n, hit.kind)) return;
  const src = engine.players[hit.src] || null;
  s.landing = true;
  try {
    const deal = () => {
      if (hit.kind === "direct") engine.dealDirect(p, hit.n, false);
      else if (hit.kind === "armor") engine.dealArmorOnly(p, hit.n, false);
      else engine.dealMixed(p, hit.n, false);
    };
    if (src) engine.withEffectSource(src, deal); else deal();
  } finally { s.landing = false; }
  engine.log(`💢 ${p.name} อดีนาลีนหมด — ความเสียหาย ${hit.n} ลง`);
  if (p.alive && p.hp <= 0) {
    if (src) engine.withEffectSource(src, () => engine.instantDeath(p)); else engine.instantDeath(p);
    if (!p.alive) p.pos = null;
  }
}

module.exports = {
  id: ID, IMG, VIDEO, CUT, MUSIC,
  ARSENAL_COST, SMOKE_TURNS, MINE_DMG, MINE_MAX, BANDAGE, ALTER, ALTER_COST, ALTER_CD, ALTER_MOV,
  SHOTS, RELOAD_COST, SHOT_LEN, DEBUFF_TURNS, EOS_ATK, ADREN_DELAY,

  resetCombat(p) { if (isMe(p)) p.kiri = fresh(); },
  maxHp(p) { return Math.max(MIN_MAX_HP, require("../server/constants").MAX_HP - ((p && p.kiri && p.kiri.hpLost) || 0)); },

  // ---------- ปุ่ม ----------
  skillPub(p, tier) {
    if (!isMe(p)) return null;
    const engine = eng(), s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      return {
        choices: ARSENAL_KEYS.map((k) => ({
          key: k, name: ARSENAL[k].name, img: IMG.arsenal, desc: `${ARSENAL[k].name}: ${ARSENAL[k].desc}`, cost: ARSENAL_COST,
          area: module.exports.skillArea(p, "basic", null, { form: k }),
          ...(k === "mine" && !isEos() ? { left: MINE_MAX - s.mines.length } : {}),
          locked: k === "bandage" && p.armor >= engine.maxArmorOf(p),
          free: inAlter(p),
        })),
      };
    }
    if (tier === "secondary") {
      const cd = cdLeft(s.alterReady, r);
      return {
        choices: ALTER_KEYS.map((k) => ({
          key: k, name: ALTER[k].name, img: IMG.alter, cost: ALTER_COST, area: { kind: "self" }, cd,
          desc: `${ALTER[k].name}: ความจุพลังชีวิต −${ALTER[k].hp} · ตี/ใช้สกิลได้ ${ALTER[k].hits} ครั้ง · เดิน ${ALTER_MOV} เติมใหม่ทุกครั้งที่ตี${isEos() ? ` · พลังโจมตี +${EOS_ATK}` : ""}`,
          locked: cd > 0 || !!s.alter, free: true,
        })),
      };
    }
    if (tier === "ultimate") {
      if (s.shots <= 0) return { name: "Thompson Contender", cost: 0 };
      if (!s.loaded) return { name: "เติมกระสุน", cost: RELOAD_COST, img: IMG.contender };
      return { name: `Thompson Contender ${s.shots}`, cost: 0, img: IMG.thompson };
    }
    return null;
  },
  skillArea(p, tier, area, opts = {}) {
    if (!isMe(p)) return area;
    if (tier === "basic") {
      if (opts.form === "smoke" || opts.form === "mine") return { kind: "tile", range: 2, place: "list", tiles: around(eng(), p, opts.form) };
      return { kind: "self" };
    }
    if (tier === "ultimate") return st(p).loaded ? { kind: "line", len: SHOT_LEN, width: 1, hostile: true } : { kind: "self" };
    return area;
  },
  skillCost(p, tier, base) {
    if (!isMe(p)) return base;
    if (tier === "basic") return ARSENAL_COST;
    if (tier === "secondary") return st(p).freeAccel ? 0 : ALTER_COST;
    if (tier === "ultimate") return st(p).loaded ? 0 : RELOAD_COST;
    return base;
  },
  skillFree(p, tier) { return isMe(p) && tier === "ultimate" && st(p).loaded; },
  // Time Alter / เติมกระสุน ไม่กินโควตา · ระหว่าง Time Alter ทุกสกิลไม่กินโควตา (นับเป็น 1 ครั้งของ Time Alter แทน)
  skipsTurnQuota(p, tier) {
    if (!isMe(p)) return false;
    return inAlter(p) || tier === "secondary" || (tier === "ultimate" && !st(p).loaded);
  },
  ignoresTurnQuota(p, tier) {
    if (!isMe(p)) return false;
    return inAlter(p) || (tier === "ultimate" && !st(p).loaded);
  },
  keepsMove(engine, p, tier, opts = {}) {
    if (!isMe(p)) return false;
    return inAlter(p) || tier === "secondary" || (tier === "basic" && opts.form === "smoke");
  },
  silentFlash(p, tier) { return tier === "secondary"; },
  // คลิปมีเสียงของตัวเอง (Time Alter / ยิง) → ไม่มีเสียงเอฟเฟกต์ · ควัน/เติมกระสุนมีเสียง · กับดักเล่นใน layMine
  skillSound(p, tier, opts = {}) {
    if (!isMe(p)) return null;
    if (tier === "ultimate") return st(p).loaded || inAlter(p) ? null : "diego_reload"; // ใน Time Alter: คลิป/เสียงเล่นใน applyInstantSkill
    if (tier === "basic" && opts.form === "smoke") return "kiri_smoke";
    return null;
  },
  endsTurn(engine, p, tier) {
    if (!isMe(p) || tier === "secondary") return false;
    const m = engine.clockUp.activeMember(p);
    return !!m && !!st(p).alter && m.hits + 1 >= m.max;
  },

  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isMe(p)) return true;
    const s = st(p);
    if (!p.pos) return false;
    if (tier === "basic") {
      if (!ARSENAL[opts.form]) return false;
      if (opts.form === "bandage") return p.armor < engine.maxArmorOf(p);
      return tileIn(around(engine, p, opts.form), opts.tile);
    }
    if (tier === "secondary") {
      if (!ALTER[opts.form] || s.alter || engine.clockUp.activeMember(p) || engine.clockUp.active()) return false;
      return s.freeAccel ? opts.form === "double" : cdLeft(s.alterReady, engine.roundNumber) === 0;
    }
    if (tier === "ultimate") {
      if (s.shots <= 0) return false;
      if (!s.loaded) return true;
      return targets.some((id) => { const t = engine.players[id]; return t && t.alive && !engine.sameTeam(p, t); });
    }
    return false;
  },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    const s = st(p);
    const counts = tier !== "secondary" && inAlter(p);
    if (tier === "basic") {
      const at = opts.tile;
      if (opts.form === "smoke") {
        laySmoke(engine, p, at);
        engine.boardFx("kiriFx", { kind: "throw", id: p.id, from: { ...p.pos }, to: { x: at.x, y: at.y }, item: "smoke" });
        engine.log(`💨 ${p.name} ระเบิดควัน`);
      } else if (opts.form === "mine") {
        layMine(engine, p, at);
        engine.log(`💣 ${p.name} วางกับดักระเบิด`);
      } else {
        const got = engine.healArmor(p, BANDAGE);
        engine.log(`🩹 ${p.name} ผ่าพันแผล — เกราะ +${got}`);
      }
    } else if (tier === "secondary") {
      const free = s.freeAccel;
      s.freeAccel = false;
      const kind = free ? "double" : opts.form;
      beginAlter(engine, p, kind, free);
      engine.queueCutscene(p, CUT[kind]);
      engine.clockUp.start(p, alterOpts(kind));
    } else if (tier === "ultimate") {
      if (s.loaded) shoot(engine, p, targets);
      else {
        if (inAlter(p) && !clipOnce(engine, p, CUT.alterReload)) engine.sfx("diego_reload"); // รอบหลังไม่มีคลิป = เสียงเติมกระสุน
        s.loaded = true;
        engine.log(`🔫 ${p.name} เติมกระสุน Thompson Contender`);
      }
    }
    if (counts) engine.clockUp.countHit(p);
    return "";
  },

  // ---------- ตีปกติ (ปืนกล Calico M950 — client/src/board/kiriFx.js kiriSmg) / ตาเดิน ----------
  attackStyle(p) { return isMe(p) ? "kiriSmg" : undefined; },
  attackSound(p) { return isMe(p) ? "kiri_smg" : undefined; },
  mov(p) { return isMe(p) && inAlter(p) ? ALTER_MOV : null; },
  critPct(p) { return isMe(p) && (!inAlter(p) || isEos()) ? CRIT : 0; },
  damageBonus(engine, attacker) { return isMe(attacker) && inAlter(attacker) && isEos() ? EOS_ATK : 0; },
  attackFxNames(p) { return isMe(p) && inAlter(p) && isEos() ? [`Time Alter +${EOS_ATK}`] : []; },
  onClockDone(engine, p) { if (isMe(p)) st(p).alter = null; },
  // การเอาตัวรอด: Double Accel ฟรีเริ่มเองต้นตาเดินถัดไป (ช่วง Clock Up อื่นค้างอยู่ = รอตาหน้า)
  onActorReady(engine, p) {
    if (!isMe(p)) return;
    const s = st(p);
    if (!s.freeAccel || s.alter || engine.clockUp.active()) return;
    s.freeAccel = false;
    beginAlter(engine, p, "double", true);
    engine.clockUp.start(p, alterOpts("double"));
    engine.queueCutscene(p, CUT.double);
    engine.pausePlayingForCutscene();
  },
  // แทรกตาคนอื่น (ตาพิเศษ kind "clockUp" เริ่ม): คลิปตามแบบที่กด
  onExtraTurn(engine, p, kind) {
    if (!isMe(p) || kind !== "clockUp" || !st(p).alter) return;
    engine.queueCutscene(p, CUT[st(p).alter.kind]);
    engine.pausePlayingForCutscene();
  },
  charAction(engine, p, key) {
    if (!isMe(p) || typeof key !== "string" || !key.startsWith("kiri:")) return false;
    return alterOffTurn(engine, p, key.slice(5));
  },

  // ---------- อดีนาลีน ----------
  adjustIncomingDamage(engine, p, n) {
    if (!isMe(p) || n <= 0) return n;
    const s = st(p);
    if (s.landing) return n;
    const kind = arguments[4] || "mixed";
    const src = engine.effectSourceId && engine.players[engine.effectSourceId];
    if (src && src.id !== p.id && !engine.sameTeam(src, p)) {
      s.pending.push({ round: engine.roundNumber + ADREN_DELAY, n, kind, src: src.id });
      engine.log(`💢 ${p.name} อดีนาลีน — ความเสียหาย ${n} ลงอีก ${ADREN_DELAY} เทิร์น`);
      return 0;
    }
    return survive(engine, p, n, kind) ? 0 : n;
  },
  onRoundStartTick(engine, p) {
    if (!isMe(p) || !p.alive) return;
    const s = st(p), r = engine.roundNumber;
    const due = s.pending.filter((h) => h.round <= r);
    if (!due.length) return;
    s.pending = s.pending.filter((h) => h.round > r);
    for (const h of due) land(engine, p, h);
  },

  // ---------- กับดักระเบิด (ฮุค broadcast walkTrap / springTrap) ----------
  walkTrap(engine, u, t) {
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.kiri || !p.kiri.mines.length || p.id === u.id || engine.sameTeam(p, u)) continue;
      const mine = p.kiri.mines.find((m) => m.x === t.x && m.y === t.y);
      if (mine) return { owner: p.id, seq: mine.seq };
    }
    return null;
  },
  springTrap(engine, u, t, info) {
    const owner = info && engine.players[info.owner];
    if (!owner || !isMe(owner)) return;
    const mine = st(owner).mines.find((m) => m.seq === info.seq);
    if (mine) explode(engine, owner, u, mine);
  },

  // ---------- จังหวะ ----------
  onEndTurn(engine) {
    // ม่านควัน: เจ้าของคนไหนก็ได้ (ลดครั้งเดียวต่อเทิร์น — วางที่ match.board)
    if (Object.values(engine.players).some((p) => isMe(p))) tickSmoke(engine);
  },
  onBoardPlaced(engine) { for (const p of Object.values(engine.players)) if (isMe(p) && p.kiri) p.kiri.mines = []; },
  onDeath(engine, p) {
    if (!isMe(p) || !p.kiri) return;
    p.kiri.mines = [];
    p.kiri.pending = [];
    p.kiri.alter = null;
  },

  // ---------- ข้อมูลกระดาน / client ----------
  boardPublic(engine) {
    const mines = [];
    for (const p of Object.values(engine.players)) {
      if (!isMe(p) || !p.kiri) continue;
      for (const m of p.kiri.mines) mines.push({ x: m.x, y: m.y, owner: p.id, color: engine.colorOf(p) });
    }
    const b = engine.board;
    const smoke = b && b.smoke ? Object.entries(b.smoke).map(([k, s]) => { const [x, y] = k.split(",").map(Number); return { x, y, left: s.left }; }) : [];
    return mines.length || smoke.length ? { kiritsugu: { mines, smoke } } : {};
  },
  skillLocks(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    return {
      basic: { cd: 0, locked: false },
      secondary: { cd: s.freeAccel ? 0 : cdLeft(s.alterReady, engine.roundNumber), locked: !!s.alter || !!engine.clockUp.activeMember(p) },
      ultimate: { cd: 0, locked: s.shots <= 0 },
    };
  },
  // players[].kiritsugu — ปุ่ม Time Alter นอกตา (ZectHud ClockUpButton)
  kiritsuguState(engine, p) {
    if (!isMe(p)) return undefined;
    const s = st(p);
    return {
      shots: s.shots, loaded: s.loaded, mines: s.mines.length, alter: s.alter ? s.alter.kind : null,
      alterCd: cdLeft(s.alterReady, engine.roundNumber), alterCost: ALTER_COST, img: IMG.alter,
      canAlter: canAlterOffTurn(engine, p), pending: s.pending.reduce((a, h) => a + h.n, 0), lastUsed: s.lastUsed,
    };
  },

  // ---------- ผลสกิลที่ตัดได้ (server/sever.js) ----------
  severables(engine, p) {
    if (!isMe(p) || !p.alive) return [];
    const s = st(p), out = [];
    if (s.freeAccel) out.push({ key: "freeAccel", label: "การเอาตัวรอดขั้นสุดยอด", at: s.freeAt, cancel: () => { s.freeAccel = false; } });
    return out;
  },
};

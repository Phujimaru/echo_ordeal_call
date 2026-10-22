// ============================================================
//  ผู้นำแห่งตระกูลเรียวกิ (Kara no Kyoukai — เรียวกิ ชิกิ ร่าง Mirai Fukuin) — มหันตภัย · unique · id "ryougi"
//  กติกาที่ผู้ใช้ตัดสิน GRID_PLAN §7.17 (2026-10-22) · สัญญาข้อมูล client .claude/plans/ryougi-contract.md · เอฟเฟกต์ client/src/board/ryougiFx.js
//
//  ค่าพื้นฐาน 7/3/1 · เดิน 4 · ตีปกติเล็งประชิด แล้วฟันแนวตรง 2 ช่อง (range [1, 1] + attackLane + laneLen 2 — เป้า + คนด้านหลัง)
//  หยินหยาง (พื้นฐาน · 0 · ปุ่ม 2 ตัวเลือก · ไม่กินโควตา · ใช้แล้วยังเดินได้ · เทิร์นเดียวกดได้ทั้ง 2 อย่าง)
//    เนตรมณะ 1 เทิร์น (คูลดาวน์ 10) — บัฟกลาง netramana 20% รวมกับ 5% ของติดตัว = 25% (ทอยครั้งเดียว — attack.strike)
//    เยียวยา 3 เทิร์น (คูลดาวน์ 5) — applyMend(p, 1, 3) ฟื้น 1 × 3 ครั้ง
//  รากฐานจิต (รอง · 4 · กินโควตา · ใช้แล้วยังเดินได้ · กดซ้ำไม่ได้ระหว่างที่ยังอยู่): สถานะ ryougiMind 3 เทิร์น ใช้ได้ 1 ครั้ง —
//    การโจมตีครั้งถัดไป (ตีปกติ/ท่าไม้ตาย) ศัตรูทุกคนที่โดน: ลบบัฟล่าสุด 1 (stripLatestBuff) + ตัดผลสกิลล่าสุด 1 (server/sever.js)
//    ลงผลก่อนดาเมจ/สังหาร (ฮุค beforeStrikeHit) — ท่าที่รอ trigger (เดอะเวิลด์ counter) จึงถูกตัดก่อนทำงาน · ถูกหลบหมด = บัฟยังอยู่
//  ดับสิ้นซะ (ท่าไม้ตาย · 6 · คูลดาวน์ 2 · เดินต่อไม่ได้แต่ไม่จบตา): พุ่งแนว 8×1 ไปลงช่องท้ายสุดที่ยืนได้
//    ศัตรูในแนว: ขโมยแต้ม 2 (ขาด = ดาเมจเพิ่ม) + ดาเมจ 3 (เกราะก่อน · ฆ่าได้ · ไม่หลบ) + ทอยสังหาร 5% ทีละคน
//    ทุกช่องที่พุ่งผ่าน (ยกเว้นช่องที่ลง) → ช่องพัง terrain "chasm" (engine.addChasm) จนเปลี่ยนภูมิภาค · สิ่งกีดขวาง/หนาม/ร้านค้าในแนวพัง
//    ทุกคน (รวมเพื่อน · ศพ) ที่อยู่บนแนว/ช่องที่ลง ถูกผลักออกข้าง (ว่างทั้งสองข้าง = สุ่ม · ไม่ว่าง = ปลิวไปที่ยืนได้ใกล้จุดเดิมที่สุด)
//  mystical eye of death perception (ติดตัว): ตีปกติ + สกิลโจมตีสังหารทันที 5% (เนตรมณะเปิดอยู่ = 25% ทั้งตีปกติและท่าไม้ตาย) · หลังท่าไม้ตาย 3 เทิร์น (นับเทิร์นที่กด)
//    พลังโจมตี +1 (สถานะ ryougiBloom) + ต้านสถานะผิดปกติ · ระหว่างนี้ฉากตีปกติเป็นกระโดดฟันข้ามหัว (ryougiLeap)
//  ถูกเรียวกิสังหารทันที = ฉากร่างแยกสองซีก → กองเลือดบนพื้น (board.ryougi.blood · ภาพเฉย ไม่ขวางทาง · อยู่จนเปลี่ยนภูมิภาค)
//
//  Claude ตัดสินเอง (บันทึกใน GRID_PLAN §7.17): ท่าไม้ตายไม่หลบ (แบบทาวววว มิสไซล์) · ผนึกห่วงเวลาซีโร่ไม่พัง · ช่องลงที่พังอยู่แล้ว/เป็นผนึก
//    = ถอยมาช่องยืนได้ที่ใกล้สุดในแนว (ไม่มีเลย = อยู่ที่เดิม) · ทอยสังหารก่อนดาเมจ (สังหารแล้วไม่ต้องลงดาเมจ)
// ============================================================
const Board = require("../server/board");
const { NETRAMANA_KILL_CHANCE, netramanaActive } = require("./_universal_status");

const ID = "ryougi";
const DIR = "/characters/ryougi";
const IMG = {
  base: `${DIR}/ryougi.webp`,
  skill1: `${DIR}/ryougi_skill1.webp`,
  skill2: `${DIR}/ryougi_skill2.webp`,
  skill3: `${DIR}/ryougi_skill3.webp`,
};
const FX = "ryougiFx"; // socket event (client/src/board/ryougiFx.js)
const MUSIC = { eyes: "ryougi_eyes", bloom: "ryougi_bloom" };
// เสียงพากย์ (server/voice.js — client/public/characters/ryougi/voice/ · ตัดจากไฟล์ผู้ใช้ ปรับดัง ~-10 LUFS)
const VOICE = {
  turn: ["ryougi_v_turn1", "ryougi_v_turn2", "ryougi_v_turn3", "ryougi_v_turn4"],
  strike: ["ryougi_v_strike1", "ryougi_v_strike2", "ryougi_v_strike3"],
  struck: ["ryougi_v_struck1", "ryougi_v_struck2"],
  basic: ["ryougi_v_basic1"],
  secondary: ["ryougi_v_secondary1", "ryougi_v_secondary2"],
  ultimate: ["ryougi_v_ult1", "ryougi_v_ult2"],
};
const VOICE_KILL = "ryougi_v_kill1";
const VOICE_DEATH = "ryougi_v_death1";

const LANE_LEN = 2;     // ตีปกติฟันแนว 2 ช่อง (ผู้ใช้: "ฟันไปข้างหน้า 2 ช่อง คนด้านหลังก็โดนด้วย")
const KILL_CHANCE = 0.05;
const EYES_CD = 10;
const MEND_CD = 5;
const MEND_AMT = 1;
const MEND_TURNS = 3;
const MIND = "ryougiMind";
const MIND_TURNS = 3;
const BLOOM = "ryougiBloom";
const BLOOM_TURNS = 3;
const BLOOM_ATK = 1;
const ULT_CD = 2;      // ผู้ใช้ลด 2026-10-22 (เดิม 5)
const ULT_DMG = 3;
const ULT_STEAL = 2;
const ULT_LEN = 8;
const ULT_AREA = { kind: "line", len: ULT_LEN, width: 1, hostile: true };
// จังหวะพักให้กระดานเล่นเอฟเฟกต์ก่อนผลลง (ต้องไม่สั้นกว่าจังหวะใน client/src/board/ryougiFx.js — RYOUGI_FX)
const DASH_SECONDS = 1.2;
const CRUMBLE_SECONDS = 1.1;
const LEAP_EXTRA = 0.5; // ฉากตีปกติแบบกระโดดข้ามหัวยาวกว่าฉากตีปกติ (attackFxExtra)
const CHOICES = {
  eyes: { name: "เนตรมณะ", img: IMG.skill3, cd: EYES_CD,
    desc: `เนตรมณะ: ตีปกติและท่าไม้ตายสังหารทันทีเพิ่ม 20% (รวม 25%) 1 เทิร์น (คูลดาวน์ ${EYES_CD} เทิร์น)` },
  mend: { name: "เยียวยา", img: IMG.skill1, cd: MEND_CD,
    desc: `เยียวยา: ต้นเทิร์นฟื้นพลังชีวิต ${MEND_AMT} รวม ${MEND_TURNS} เทิร์น (คูลดาวน์ ${MEND_CD} เทิร์น)` },
};
const CHOICE_KEYS = Object.keys(CHOICES);
const LINE = Board.LINE_DIRS;
const PERP = { up: ["left", "right"], down: ["left", "right"], left: ["up", "down"], right: ["up", "down"] };
const key = (x, y) => `${x},${y}`;

const isRyougi = (p) => !!p && p.characterId === ID && !p.summon;
function fresh() {
  return {
    eyesReady: 0, mendReady: 0, ultReady: 0,
    eyesAt: 0, bloomAt: 0, // ลำดับตอนเปิด (เพลง — ใหม่กว่าชนะ)
    mindSeq: -1,           // engine.cmdSeq ของการตีที่รากฐานจิตลงผลแล้ว (หมดหลังการตีครั้งนั้นจบ)
  };
}
function st(p) { return p.ryougi || (p.ryougi = fresh()); }
const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);
const on = (p, k) => ((p.statuses && p.statuses[k]) || 0) > 0;
const bloomOn = (p) => isRyougi(p) && on(p, BLOOM);
const mindOn = (p) => isRyougi(p) && on(p, MIND);
function cdOf(engine, p, form) {
  const s = st(p), r = engine.roundNumber;
  return cdLeft(form === "eyes" ? s.eyesReady : s.mendReady, r);
}
function fx(engine, p, kind, extra) {
  engine.boardFx(FX, { kind, id: p.id, color: engine.colorOf(p), ...(p.pos ? { at: { ...p.pos } } : {}), size: engine.sizeOf(p), ...extra });
}
const voice = (engine, p, k) => engine.sfx(k, null, { voice: p.id });
const vit = (t) => (t.hp || 0) + (t.armor || 0);
// ดาเมจจากสกิล (เกราะรับก่อน · ตายได้) → ดาเมจที่เข้าจริง
function hurt(engine, t, n) {
  t.wasAttacked = true;
  const before = vit(t);
  engine.dealMixed(t, n);
  if (t.alive && t.hp <= 0) engine.instantDeath(t);
  if (!t.alive) t.pos = null;
  return Math.max(0, before - vit(t));
}
const enemiesOf = (engine, p, ids) => (ids || []).map((id) => engine.players[id])
  .filter((t) => t && t.alive && t.pos && t.id !== p.id && !engine.sameTeam(p, t));

// ---------- สังหารทันที → กองเลือด ----------
function slain(engine, p, t, at, how) {
  if (!at) return;
  const size = Math.max(1, (t.boardSize | 0) || 1);
  const b = engine.board;
  if (b) (b.ryougiBlood ||= []).push({ x: at.x, y: at.y, size, id: t.id });
  t.ryougiSlain = true;
  // ตีปกติ: ภาพเริ่มตอนจังหวะปะทะของฉากตี → client เล่นเสียงเองตอนนั้น (sound/line) · สกิล: เสียงลงพร้อมภาพทันที
  if (how === "strike") { fx(engine, p, "kill", { targetId: t.id, to: { ...at }, tsize: size, how, sound: "ryougi_kill", line: VOICE_KILL }); return; }
  fx(engine, p, "kill", { targetId: t.id, to: { ...at }, tsize: size, how });
  engine.sfx("ryougi_kill");
  voice(engine, p, VOICE_KILL);
}
// ทอยสังหารทันทีของสกิลโจมตี (5% · เนตรมณะเปิดอยู่ = 25% — ผู้ใช้สั่ง 2026-10-22) → true = ตายแล้ว
const skillKillChance = (p) => KILL_CHANCE + (netramanaActive(p) ? NETRAMANA_KILL_CHANCE : 0);
function trySkillKill(engine, p, t) {
  const pct = skillKillChance(p);
  if (!(Math.random() < pct)) return false;
  const at = t.pos ? { ...t.pos } : null;
  engine.instantDeath(t);
  t.wasAttacked = true;
  if (t.alive) { engine.log(`💀 ${p.name} พยายามสังหาร ${t.name} ทันที — แต่ ${t.name} รอดไปได้!`); return false; }
  t.pos = null;
  engine.log(`💀 ${p.name} สังหาร ${t.name} ทันที (โอกาส ${Math.round(pct * 100)}%)`);
  slain(engine, p, t, at, "skill");
  return true;
}

// ---------- รากฐานจิต ----------
// ลบบัฟล่าสุด 1 + ตัดผลสกิลล่าสุด 1 ของเป้า → ชื่อป้าย
function applyMind(engine, p, t, strike = false) {
  const stripped = engine.stripLatestBuff(t);
  const severed = engine.sever.cut(engine, t);
  st(p).mindSeq = engine.cmdSeq;
  const names = [];
  if (stripped) names.push(`รากฐานจิต — ลบ ${stripped.label}`);
  if (severed) names.push(`รากฐานจิต — ตัด ${severed.label}`);
  if (!names.length) names.push("รากฐานจิต");
  engine.log(`🗡️ ${p.name} รากฐานจิต → ${t.name}${stripped ? ` · ลบบัฟ ${stripped.label}` : ""}${severed ? ` · ตัด ${severed.label}` : ""}${!stripped && !severed ? " (ไม่มีอะไรให้ตัด)" : ""}`);
  if (t.pos) fx(engine, p, "sever", { targetId: t.id, to: { ...t.pos }, tsize: engine.sizeOf(t), stripped: stripped ? stripped.label : null, severed: severed ? severed.label : null, ...(strike ? { sound: "ryougi_sever" } : {}) });
  if (!strike || !t.pos) engine.sfx("ryougi_sever"); // ตีปกติ: client เล่นตอนจังหวะปะทะ (sound)
  return names;
}
function spendMind(engine, p) {
  const s = st(p);
  if (s.mindSeq !== engine.cmdSeq || !on(p, MIND)) return;
  delete p.statuses[MIND];
  s.mindSeq = -1;
  engine.log(`🗡️ ${p.name} — รากฐานจิตถูกใช้ไปแล้ว`);
}

// ---------- ดับสิ้นซะ ----------
// ช่องในแนว 8×1 (ตัดที่ขอบกระดาน) และช่องที่ลง (ท้ายสุดที่ไม่ใช่ช่องพัง/ผนึก) — ไม่มีช่องลง = อยู่ที่เดิม
function dashPlan(engine, p, dir) {
  if (!p.pos || !LINE[dir]) return null;
  const map = engine.boardMap(), [dx, dy] = LINE[dir];
  const tiles = [];
  for (let i = 1; i <= ULT_LEN; i++) {
    const x = p.pos.x + dx * i, y = p.pos.y + dy * i;
    if (!Board.inBounds(map, x, y)) break;
    tiles.push({ x, y });
  }
  if (!tiles.length) return null;
  let land = null;
  for (let i = tiles.length - 1; i >= 0; i--) {
    const kind = map.terrain[key(tiles[i].x, tiles[i].y)];
    if (kind === "chasm" || (kind && Board.UNBREAKABLE.has(kind))) continue;
    land = tiles[i];
    break;
  }
  return { tiles, land, dir };
}
// ช่องว่างที่ยืนได้ใกล้ want ที่สุด สำหรับตัวขนาด n (skip = id ที่ไม่นับเป็นสิ่งขวาง)
function spotNear(engine, n, want, skip, taken) {
  const map = engine.boardMap(), blocked = engine.boardBlocked(skip[0]);
  const others = engine.boardUnits().filter((u) => !skip.includes(u.id));
  let best = null;
  for (let y = 0; y + n <= map.rows; y++) {
    for (let x = 0; x + n <= map.cols; x++) {
      const d = Math.abs(x - want.x) + Math.abs(y - want.y);
      if (best && d >= best.d) continue;
      if (Board.footprint(x, y, n).some((t) => Board.isObstacle(map, t.x, t.y, blocked) || Board.unitAt(others, t.x, t.y) || taken.has(key(t.x, t.y)))) continue;
      best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}
function freeFor(engine, x, y, selfId, taken) {
  const map = engine.boardMap();
  if (Board.isObstacle(map, x, y, engine.boardBlocked(selfId)) || taken.has(key(x, y))) return false;
  return !engine.boardUnits().some((u) => u.id !== selfId && Board.footprint(u.x, u.y, u.size || 1).some((t) => t.x === x && t.y === y));
}
// ผลักทุกคน (รวมเพื่อน/ศพ) ที่ทับแนวที่พัง/ช่องที่ลงออกข้าง → [{ id, from, to, corpse? }]
function pushOut(engine, p, plan, zone) {
  const out = [];
  const taken = new Set(); // ช่องที่ศพเพิ่งถูกย้ายไป (ศพไม่อยู่ใน boardUnits)
  const hits = (x, y, n) => Board.footprint(x, y, n).some((t) => zone.has(key(t.x, t.y)));
  const units = engine.boardUnits().filter((u) => u.id !== p.id && hits(u.x, u.y, u.size || 1));
  for (const u of units) {
    const o = engine.players[u.id];
    if (!o || !o.pos) continue;
    const n = engine.sizeOf(o), from = { ...o.pos };
    let to = null;
    if (n === 1) {
      const sides = PERP[plan.dir].map((d) => ({ x: from.x + LINE[d][0], y: from.y + LINE[d][1] }))
        .filter((t) => freeFor(engine, t.x, t.y, o.id, taken));
      if (sides.length) to = sides.length > 1 ? sides[Math.floor(Math.random() * sides.length)] : sides[0];
    }
    if (!to) to = spotNear(engine, n, from, [o.id], taken);
    if (!to) continue;
    engine.ice.revealPushed(o);
    o.pos = { x: to.x, y: to.y };
    out.push({ id: o.id, from, to: { ...o.pos }, dir: { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) } });
  }
  // ศพที่ค้างบนกระดาน (ระบบคู่ / มีคนเก็บศพ) — ย้ายแบบเดียวกัน
  for (const o of Object.values(engine.players)) {
    if (o.alive || !o.corpse || !engine.corpseKept(o) || !zone.has(key(o.corpse.x, o.corpse.y))) continue;
    const from = { x: o.corpse.x, y: o.corpse.y };
    const sides = PERP[plan.dir].map((d) => ({ x: from.x + LINE[d][0], y: from.y + LINE[d][1] }))
      .filter((t) => freeFor(engine, t.x, t.y, o.id, taken));
    const to = sides.length ? sides[Math.floor(Math.random() * sides.length)] : spotNear(engine, 1, from, [o.id], taken);
    if (!to) continue;
    o.corpse = { ...o.corpse, x: to.x, y: to.y };
    taken.add(key(to.x, to.y));
    out.push({ id: o.id, from, to: { x: to.x, y: to.y }, corpse: true });
  }
  return out;
}
function ultimate(engine, p, dir, ids) {
  const plan = dashPlan(engine, p, dir);
  if (!plan || !p.alive) return;
  const from = { ...p.pos };
  fx(engine, p, "dash", { dir, from, to: plan.land ? { ...plan.land } : from, tiles: plan.tiles });
  engine.sfx("ryougi_dash");
  engine.skillBeat(DASH_SECONDS, () => {
    if (!p.alive) return;
    // ศัตรูในแนว: รากฐานจิต → ขโมยแต้ม → ทอยสังหาร 5% → ดาเมจ
    const line = new Set(plan.tiles.map((t) => key(t.x, t.y)));
    const onLine = (t) => t.pos && Board.footprint(t.pos.x, t.pos.y, engine.sizeOf(t)).some((c) => line.has(key(c.x, c.y)));
    let mindUsed = false;
    for (const t of enemiesOf(engine, p, ids).filter(onLine)) {
      if (mindOn(p)) { applyMind(engine, p, t); mindUsed = true; }
      const take = Math.min(ULT_STEAL, Math.max(0, t.skillPoints || 0));
      t.skillPoints = (t.skillPoints || 0) - take;
      const extra = ULT_STEAL - take;
      if (take) engine.addSkill(p, take, "passive");
      if (take) fx(engine, p, "steal", { targetId: t.id, to: { ...t.pos }, amt: take });
      if (trySkillKill(engine, p, t)) continue;
      const dealt = hurt(engine, t, ULT_DMG + extra);
      engine.log(`🗡️ ดับสิ้นซะ → ${t.name} -${dealt} (ลดเกราะก่อน) · ขโมยแต้มสกิล ${take}${extra ? ` · ขาด ${extra} = ความเสียหายเพิ่ม` : ""}`);
      if (!t.alive) engine.log(`💀 ${t.name} เลือดจริงหมด ตกรอบ!`);
    }
    if (mindUsed && on(p, MIND)) { delete p.statuses[MIND]; st(p).mindSeq = -1; engine.log(`🗡️ ${p.name} — รากฐานจิตถูกใช้ไปแล้ว`); }

    // ทุกอย่างในแนวพัง → ช่องพัง (ยกเว้นช่องที่ลง)
    const landKey = plan.land ? key(plan.land.x, plan.land.y) : null;
    const map = engine.boardMap();
    const keys = plan.tiles.map((t) => key(t.x, t.y)).filter((k) => k !== landKey && !(map.terrain[k] && Board.UNBREAKABLE.has(map.terrain[k]) && map.terrain[k] !== "chasm"));
    const razed = engine.breakObstacles([...keys, ...(landKey ? [landKey] : [])]);
    const shop = engine.shopPos;
    const shopHit = shop && (keys.includes(key(shop.x, shop.y)) || landKey === key(shop.x, shop.y)) ? { ...shop } : null;
    if (shopHit) { engine.razeShop(); engine.log("🏪 ร้านค้ามายาพังทลาย — หายไปจนถึงรอบย้ายร้าน"); }
    const fresh = engine.addChasm(keys);

    // เรียวกิลงช่องท้ายสุด แล้วผลักทุกคนบนแนว/ช่องที่ลงออกข้าง
    if (plan.land) {
      p.pos = { ...plan.land };
      Object.assign(engine.action || {}, { from: { ...p.pos }, path: null, trail: null, iceUndo: null, smashed: null });
    }
    const zone = new Set([...keys, ...(landKey ? [landKey] : [])]);
    const pushes = pushOut(engine, p, plan, zone);
    fx(engine, p, "crumble", {
      dir, land: { ...p.pos }, tiles: fresh.map((k) => { const [x, y] = k.split(",").map(Number); return { x, y }; }),
      pushes, razed: razed.map((r) => ({ x: r.x, y: r.y, kind: r.kind })), shop: shopHit,
    });
    engine.sfx("ryougi_crumble");
    engine.log(`🗡️ ${p.name} ดับสิ้นซะ — พื้น ${fresh.length} ช่องพังทลาย${pushes.length ? ` · ผลัก ${pushes.length} คนออกข้าง` : ""}`);
    // ลงน้ำแข็งหลังถูกผลัก = ไถลต่อ · ทางที่ถูกพาผ่าน (เซลินปลูกพุ่ม ฯลฯ) — ฉากผลักเล่นเอง (via ไม่ใช่ from)
    const moves = pushes.filter((m) => !m.corpse).map((m) => ({ id: m.id, via: m.from, to: m.to, dir: m.dir }));
    if (moves.length) engine.ice.forcedSlides(moves, p);

    // หลังปล่อยท่าไม้ตาย: พลังโจมตี +1 + ต้านสถานะ 3 เทิร์น (นับเทิร์นนี้) · ซากุระโปรยทั่วแผนที่
    engine.skillBeat(CRUMBLE_SECONDS, () => {
      if (!p.alive) return;
      p.statuses[BLOOM] = BLOOM_TURNS;
      engine.applyBuff(p, "resist", null, BLOOM_TURNS);
      st(p).bloomAt = engine.severStamp();
      fx(engine, p, "bloom", {});
      engine.sfx("ryougi_bloom_burst"); // คีย์เสียงต่างจากเพลง ryougi_bloom (FILES ใน client/src/audio.js ใช้ชื่อร่วมกัน)
      engine.log(`🌸 ${p.name} — พลังโจมตี +${BLOOM_ATK} และต้านสถานะผิดปกติ ${BLOOM_TURNS} เทิร์น`);
    });
  });
}

module.exports = {
  id: ID,
  IMG, FX, MUSIC, VOICE, VOICE_KILL, VOICE_DEATH, CHOICES, CHOICE_KEYS,
  KILL_CHANCE, EYES_CD, MEND_CD, MEND_AMT, MEND_TURNS, MIND, MIND_TURNS, BLOOM, BLOOM_TURNS, BLOOM_ATK,
  ULT_CD, ULT_DMG, ULT_STEAL, ULT_LEN, ULT_AREA, DASH_SECONDS, CRUMBLE_SECONDS, LEAP_EXTRA,
  isRyougi, bloomOn, mindOn, dashPlan,

  resetCombat(p) {
    p.ryougi = isRyougi(p) ? fresh() : null;
    p.ryougiSlain = false;
  },
  voiceLines(p) { return isRyougi(p) ? VOICE : null; },
  onDeath(engine, p) { if (isRyougi(p)) voice(engine, p, VOICE_DEATH); },

  // ---------- ตีปกติ ----------
  attackLane(p) { return isRyougi(p); },
  laneLen(p) { return isRyougi(p) ? LANE_LEN : 0; }, // เล็งประชิด (range [1, 1]) แต่ฟันแนวยาว 2 ช่อง — เป้า + คนด้านหลัง
  killChance(p) { return isRyougi(p) ? KILL_CHANCE : 0; },
  damageBonus(engine, attacker) { return bloomOn(attacker) ? BLOOM_ATK : 0; },
  attackFxNames(attacker) { return bloomOn(attacker) ? [`ดับสิ้นซะ — พลังโจมตี +${BLOOM_ATK}`] : []; },
  attackStyle(p) { return isRyougi(p) ? (bloomOn(p) ? "ryougiLeap" : "ryougiSlash") : null; },
  attackSound(p) { return isRyougi(p) ? (bloomOn(p) ? "ryougi_leap" : "ryougi_slash") : undefined; },
  attackFxExtra(p) { return bloomOn(p) ? LEAP_EXTRA : 0; },
  beforeStrikeHit(engine, attacker, target) {
    if (!mindOn(attacker) || !target || engine.sameTeam(attacker, target)) return [];
    return applyMind(engine, attacker, target, true);
  },
  afterStrike(engine, p) { if (isRyougi(p)) spendMind(engine, p); },
  onInstaKill(engine, attacker, target, at, how) { if (isRyougi(attacker)) slain(engine, attacker, target, at, how); },

  // ---------- สกิล ----------
  skillPub(p, tier) {
    if (!isRyougi(p) || tier !== "basic") return null;
    const engine = require("../server/engine").engine;
    return {
      choices: CHOICE_KEYS.map((k) => {
        const cd = cdOf(engine, p, k);
        return { key: k, name: CHOICES[k].name, img: CHOICES[k].img, desc: CHOICES[k].desc, area: { kind: "self" }, cost: 0, cd, on: k === "eyes" ? on(p, "netramana") : on(p, "mend"), locked: cd > 0, free: true };
      }),
    };
  },
  canUseSkill(engine, p, tier, targets, opts = {}) {
    if (!isRyougi(p)) return true;
    if (!p.pos) return false;
    if (tier === "basic") return !!CHOICES[opts.form] && cdOf(engine, p, opts.form) === 0;
    if (tier === "secondary") return !on(p, MIND);
    if (tier === "ultimate") return cdLeft(st(p).ultReady, engine.roundNumber) === 0 && !!dashPlan(engine, p, opts.dir);
    return false;
  },
  skipsTurnQuota(p, tier) { return isRyougi(p) && tier === "basic"; },
  ignoresTurnQuota(p, tier) { return isRyougi(p) && tier === "basic"; },
  keepsMove(engine, p, tier) { return isRyougi(p) && (tier === "basic" || tier === "secondary"); },
  applyInstantSkill(engine, p, tier, targets, opts = {}) {
    if (!isRyougi(p)) return "";
    const s = st(p), r = engine.roundNumber;
    if (tier === "basic") {
      if (opts.form === "eyes") {
        engine.applyBuff(p, "netramana", null, 1);
        s.eyesReady = r + EYES_CD;
        s.eyesAt = engine.severStamp();
        fx(engine, p, "eyes", {});
        engine.sfx("ryougi_eyes_open");
        engine.log(`👁️ ${p.name} หยินหยาง — เนตรมณะ (ตีปกติและท่าไม้ตายสังหารทันที ${Math.round((NETRAMANA_KILL_CHANCE + KILL_CHANCE) * 100)}% เทิร์นนี้)`);
        return " — เนตรมณะ";
      }
      engine.applyMend(p, MEND_AMT, MEND_TURNS);
      s.mendReady = r + MEND_CD;
      fx(engine, p, "yinyang", { form: "mend" });
      engine.sfx("ryougi_yinyang");
      engine.log(`☯️ ${p.name} หยินหยาง — เยียวยา ${MEND_TURNS} เทิร์น`);
      return " — เยียวยา";
    }
    if (tier === "secondary") {
      p.statuses[MIND] = MIND_TURNS;
      s.mindSeq = -1;
      fx(engine, p, "mind", {});
      engine.sfx("ryougi_mind");
      engine.log(`🗡️ ${p.name} รากฐานจิต (${MIND_TURNS} เทิร์น · ใช้ได้ 1 ครั้ง)`);
      return "";
    }
    if (tier === "ultimate") {
      s.ultReady = r + ULT_CD;
      engine.log(`🗡️ ${p.name} ดับสิ้นซะ!`);
      ultimate(engine, p, opts.dir, [...(targets || [])]);
      return "";
    }
    return "";
  },

  // ---------- เพลง / ชั้นบนพื้น / ข้อมูลให้ client ----------
  skillMusic(engine, p) {
    if (!isRyougi(p) || !p.alive) return null;
    const s = st(p);
    const eyes = on(p, "netramana") ? { music: MUSIC.eyes, at: s.eyesAt } : null;
    const bloom = on(p, BLOOM) ? { music: MUSIC.bloom, at: s.bloomAt } : null;
    if (eyes && bloom) return eyes.at > bloom.at ? eyes : bloom;
    return eyes || bloom;
  },
  boardPublic(engine) {
    const b = engine.board;
    return b && b.ryougiBlood && b.ryougiBlood.length ? { ryougi: { blood: b.ryougiBlood.map((d) => ({ ...d })) } } : {};
  },
  ryougiState(engine, p) {
    if (!isRyougi(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    return {
      eyesCd: cdLeft(s.eyesReady, r), mendCd: cdLeft(s.mendReady, r), ultCd: cdLeft(s.ultReady, r),
      eyes: (p.statuses && p.statuses.netramana) || 0, mind: (p.statuses && p.statuses[MIND]) || 0, bloom: (p.statuses && p.statuses[BLOOM]) || 0,
    };
  },
  skillLocks(engine, p) {
    if (!isRyougi(p)) return undefined;
    const s = st(p), r = engine.roundNumber;
    const eyesCd = cdOf(engine, p, "eyes"), mendCd = cdOf(engine, p, "mend");
    return {
      basic: { cd: Math.min(eyesCd, mendCd), locked: eyesCd > 0 && mendCd > 0, free: true },
      secondary: { cd: 0, locked: on(p, MIND) },
      ultimate: { cd: cdLeft(s.ultReady, r) },
    };
  },
};

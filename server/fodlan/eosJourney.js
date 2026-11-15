// ============================================================
//  สนาม Eos — ขั้น 4: รถไฟ · อุโมงค์/กอนโดลา · รถราง · แคมป์/อาหาร · ตกปลา · สุสานอาวุธหลวง · ค่าหัว
//  แยกออกจาก server/fodlan/stage6.js (ย้ายโค้ดล้วน · พฤติกรรมเดิม) · ฮุคทั้งหมดยังส่งออกผ่าน stage6.js
// ============================================================
const MAP = require("./map6");
const E = require("./eosEvents");
const XT = require("./eosExtra");
const AR = require("./eosArms");
const { lazyShop, bodies, mobsOf, heroes, sizeOf, footOf, tileFree, freeNear, canMove, canStrike } = require("./eosCore");
const HH = require("./eosH");
const RD = require("./eosRide");
const SC = require("./eosScore");

// ============================================================ ขั้น 4: เดินทาง (L2–L4) + เก็บของ/บัฟ (L16–L19) — ตัวเลข/รายละเอียด Claude ตัดสิน (ผู้ใช้สั่ง "Start phase 4")
//  L2 รถไฟ: ทุก TRAIN_EVERY เทิร์น (เทิร์น 4, 8, …) วิ่งตามราง y = 20 สลับทิศ · เทิร์นก่อนผ่าน = เตือนทั้งราง
//     ต้นเทิร์นที่ผ่าน: คนบนราง (ไม่บิน) TRAIN_DMG + กระเด็นออกข้างราง · ปีศาจ/ศัตรูบนราง TRAIN_DMG · รถจอดบนราง = ถูกดันออก
//     ยืนบนชานชาลา = ขึ้นรถไฟ ไปลงชานชาลาอีกฝั่ง
//  L3 กอนโดลา: ยืนบนท่า (Altissia) + ยังเดินได้ → เลือกท่าอื่น ไปทันที (จบการเดินของตา)
//  L4 อุโมงค์: ยืนบนปากอุโมงค์ + ยังเดินได้ → ออกปากคู่ (จบการเดินของตา)
//  L16 แคมป์: ยืนบนแคมป์ → เลือกอาหาร 1 อย่าง (ใช้การตี) บัฟ CAMP_TURNS เทิร์น · คนละ 1 ครั้งทุก CAMP_CD เทิร์น
//      สตูว์ = ตี +1 · ปลาย่าง = ฟื้นเลือด 1 ทุกต้นเทิร์น · ข้าวกล่อง = เดิน +1
//  L17 ตกปลา: ยืนบนจุดตกปลา (ใช้การตี) สุ่ม: ปลา (ฟื้นเลือด 2) · เหรียญ 3 · ปลาทอง (เหรียญ 6) · ปลายักษ์ลากลงน้ำ (ดาเมจ 2)
//  L18 สุสานราชวงศ์ 3 แห่ง: ยืนติด → เปิด (ใช้การตี · แห่งละครั้งต่อแมตช์) ได้อาวุธหลวง ARM_TURNS เทิร์น: ตี +1 แต่ตาที่ตี เสียเลือด 1 (ไม่ถึงตาย)
//  L19 บอร์ดล่าค่าหัว: ยืนติดร้าน → รับค่าหัว (ไม่ใช้การตี · ถือได้ครั้งละ 1): ปีศาจ / สัตว์ยักษ์ / ทหารเหล็ก / ผู้เล่นฝ่ายอื่น 1 คน → ล้มได้ = เหรียญ
const TRAIN_EVERY = 4;
const TRAIN_DMG = 3;
const CAMP_TURNS = 3;
const CAMP_CD = 4;
const ARM_TURNS = 5;
// อาหารทีม (ผู้ใช้เลือกไอเดีย 2026-11-10 "ทำอาหารที่แคมป์จากปลาที่ตกได้ บัฟแรงขึ้น ให้ทั้งทีมกิน") — ใช้ปลาในถุง · ตัวเลข Claude ตั้ง
const FISH_MAX = 3;
const TEAM_MEALS = {
  grill: { icon: "🍢", name: "ปลาย่างทั้งทีม", fish: 1, desc: "ปลา 1 · ทั้งทีมเลือด +2 · ฟื้น 1/เทิร์น 3 เทิร์น" },
  feast: { icon: "🥘", name: "งานเลี้ยงทีม", fish: 2, desc: "ปลา 2 · ทั้งทีมตี +1 เดิน +1 ฟื้น 1/เทิร์น 3 เทิร์น" },
};
const CAMP_MEALS = {
  atk: { icon: "🍲", name: "สตูว์", desc: "ตี +1 · 3 เทิร์น" },
  mend: { icon: "🐟", name: "ปลาย่าง", desc: "ฟื้น 1/เทิร์น · 3 เทิร์น" },
  mov: { icon: "🍙", name: "ข้าวกล่อง", desc: "เดิน +1 · 3 เทิร์น" },
};
const BOUNTY = { daemon: { icon: "👹", name: "ปีศาจ", gold: 4 }, beast: { icon: "🦣", name: "สัตว์ยักษ์", gold: 8 }, magitek: { icon: "🤖", name: "ทหารเหล็ก", gold: 4 }, player: { icon: "🎯", name: "ผู้เล่น", gold: 6 } };
const SECS4 = { train: 2.4, warn: 0.6 };
const sameT = (a, b) => a && b && a.x === b.x && a.y === b.y;
const onRail = (x, y) => y === MAP.RAIL_Y && x >= 0 && x < 32;
const tl = ([x, y]) => ({ x, y });
function p4State(s) {
  if (!s.p4) s.p4 = { trainNext: TRAIN_EVERY, trainDir: 1, trainWarn: false, buffs: {}, campCd: {}, tombs: MAP.TOMBS.map(() => false), arms: {}, armPaid: {}, bounty: {} };
  return s.p4;
}
// ---------- L2 รถไฟ ----------
function trainTurn(ctx, s, turn) {
  const q = p4State(s);
  // รถไฟขนเสบียงจอดอยู่ = รถไฟปกติรอ (กันรถไฟชนขบวนที่จอด — ผู้ใช้แจ้ง 2026-11-10)
  if (s.sky && s.sky.supply && turn >= q.trainNext - 1) { q.trainNext = Math.max(q.trainNext, turn + 3); q.trainWarn = false; return 0; }
  if (turn === q.trainNext - 1 && !q.trainWarn) {
    q.trainWarn = true;
    ctx.bump();
    ctx.fx("train_warn", { dir: q.trainDir, y: MAP.RAIL_Y });
    ctx.log("🚆 รถไฟกำลังมา — ออกจากราง!");
    return SECS4.warn;
  }
  if (turn < q.trainNext) return 0;
  const dir = q.trainDir, hits = [], carried = [];
  // ขึ้นรถไฟ: คนบนชานชาลา → ชานชาลาอีกฝั่ง
  const st = MAP.STATIONS.map(tl);
  for (const p of bodies(ctx)) {
    const i = st.findIndex((t) => sameT(t, p.pos));
    if (i < 0 || sizeOf(ctx, p) > 1 || p.summon) continue;
    const to = st[1 - i];
    const spot = tileFree(ctx, s, to.x, to.y, p.id) ? to : freeNear(ctx, s, to.x, to.y, 3, p.id);
    if (!spot) continue;
    carried.push({ id: p.id, from: { ...p.pos }, to: { ...spot } });
    p.pos = { x: spot.x, y: spot.y };
  }
  // ชนคนบนราง
  for (const p of bodies(ctx)) {
    if (!footOf(ctx, p).some((t) => onRail(t.x, t.y)) || ctx.action.flies(p) || carried.some((c) => c.id === p.id)) continue;
    const from = { ...p.pos };
    const dealt = ctx.damage(p, TRAIN_DMG);
    if (p.alive && p.pos) {
      const side = [MAP.RAIL_Y - 1, MAP.RAIL_Y + 1].map((y) => ({ x: p.pos.x, y })).find((t) => tileFree(ctx, s, t.x, t.y, p.id))
        || freeNear(ctx, s, p.pos.x, p.pos.y, 3, p.id, (x, y) => !onRail(x, y));
      if (side) p.pos = { x: side.x, y: side.y };
    }
    hits.push({ id: p.id, from, to: p.pos ? { ...p.pos } : null, dmg: dealt });
    ctx.log(`🚆 รถไฟชน ${p.name} -${dealt}`);
  }
  for (const c of s.cars) if (!c.driver && onRail(c.x, c.y)) {
    const spot = freeNear(ctx, s, c.x, c.y, 3, null, (x, y) => !onRail(x, y) && RD.carGround(ctx, s, x, y));
    if (spot) { c.x = spot.x; c.y = spot.y; }
  }
  for (const c of s.chocos) if (c.x != null && !c.rider && onRail(c.x, c.y)) RD.sendHome(ctx, s, c, { x: c.x, y: c.y });
  q.trainNext += TRAIN_EVERY;
  q.trainDir = -dir;
  q.trainWarn = false;
  ctx.bump();
  ctx.fx("train_pass", { dir, y: MAP.RAIL_Y, hits, carried });
  if (carried.length) ctx.log(`🚆 รถไฟพา ${carried.map((c) => ctx.match.players[c.id].name).join(", ")} ข้ามแผนที่`);
  return SECS4.train;
}
// ---------- L3 กอนโดลา / L4 อุโมงค์ ----------
function travelTiles(ctx, s, p, list) {
  const here = list.findIndex((t) => sameT(t, p.pos));
  if (here < 0) return null;
  return list.filter((_, i) => i !== here).map((t) => (tileFree(ctx, s, t.x, t.y, p.id) ? t : freeNear(ctx, s, t.x, t.y, 2, p.id))).filter(Boolean);
}
const tunnelOf = (p) => { for (const pair of MAP.TUNNELS) { const i = pair.findIndex(([x, y]) => x === p.pos.x && y === p.pos.y); if (i >= 0) return [tl(pair[i]), tl(pair[1 - i])]; } return null; };
function canTravel(ctx, s, p) { return canMove(ctx, p) && sizeOf(ctx, p) === 1 && !RD.driving(s, p); }
function travel(ctx, s, p, tile, kind) {
  if (!canTravel(ctx, s, p)) return false;
  let opts;
  if (kind === "gondola") opts = travelTiles(ctx, s, p, MAP.DOCKS.map(tl)) || [];
  else { const t = tunnelOf(p); opts = t ? [tileFree(ctx, s, t[1].x, t[1].y, p.id) ? t[1] : freeNear(ctx, s, t[1].x, t[1].y, 2, p.id)].filter(Boolean) : []; }
  // อุโมงค์มีปลายทางเดียว = กดปุ่มแล้วไปเลย (ผู้ใช้แจ้ง 2026-11-10 "อุโมงค์ใช้ไม่ได้" — เดิมต้องคลิกปากอีกฝั่งที่อยู่นอกจอ)
  const to = tile ? opts.find((t) => sameT(t, tile)) : opts.length === 1 ? opts[0] : null;
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  ctx.action.lockMove(p);
  ctx.bump();
  ctx.fx(kind, { id: p.id, from, to: { ...to } });
  ctx.log(kind === "gondola" ? `🛶 ${p.name} นั่งกอนโดลา` : `🕳️ ${p.name} ลอดอุโมงค์`);
  return true;
}
// ---------- รถราง (ผู้ใช้สั่ง 2026-11-11 "เชื่อมสถานีแต่ละเมือง ไปถึงกันได้"): ยืนบนป้าย → เลือกป้ายปลายทาง (จบการเดินของตา) ----------
const TRAM_STOPS = (MAP.TRAMS || []).map((t) => ({ zone: t.zone, x: t.at[0], y: t.at[1] }));
const tramHere = (p) => (p && p.pos ? TRAM_STOPS.find((t) => sameT(t, p.pos)) || null : null);
const tramDest = (ctx, s, p, t) => (tileFree(ctx, s, t.x, t.y, p.id) ? { x: t.x, y: t.y } : freeNear(ctx, s, t.x, t.y, 2, p.id));
// โควตา (ผู้ใช้สั่ง 2026-11-11): คนละ 2 เที่ยว แล้วพัก 2 เทิร์น จึงได้อีก 2 เที่ยว
const TRAM = { uses: 2, cd: 2 };
// ยาก / Lament ไม่มีรถราง (ผู้ใช้สั่ง 2026-11-12 "เอารถรางออก เคลื่อนที่ไปแต่ละเมืองออก ในโหมด ยาก และ lament")
const tramOff = (ctx) => { const d = (ctx.match && ctx.match.eosDiff) || "normal"; return d === "hard" || d === "lament"; };
const tramQ = (s, p) => { const q = p4State(s); q.tram ||= {}; return q.tram[p.id] || (q.tram[p.id] = { left: TRAM.uses, readyAt: 0 }); };
const tramCd = (ctx, s, p) => Math.max(0, tramQ(s, p).readyAt - ctx.match.roundNumber);
function tramLeft(ctx, s, p) { const t = tramQ(s, p); if (t.left <= 0 && tramCd(ctx, s, p) === 0) t.left = TRAM.uses; return t.left; }
function rideTram(ctx, s, p, zone) {
  const a = tramHere(p), b = TRAM_STOPS.find((t) => t.zone === zone);
  if (tramOff(ctx) || !a || !b || a === b || !canTravel(ctx, s, p) || tramLeft(ctx, s, p) <= 0) return false;
  const to = tramDest(ctx, s, p, b);
  if (!to) return false;
  const from = { ...p.pos };
  p.pos = { x: to.x, y: to.y };
  ctx.action.lockMove(p);
  ctx.bump();
  const tq = tramQ(s, p);
  tq.left -= 1;
  if (tq.left <= 0) tq.readyAt = ctx.match.roundNumber + TRAM.cd;
  ctx.fx("tram", { id: p.id, from, to: { ...to }, a: a.zone, b: b.zone });
  ctx.log(`🚋 ${p.name} นั่งรถรางไป ${SC.ZONE_NAMES[b.zone] || b.zone}`);
  return true;
}
// ---------- L16 แคมป์ ----------
const onSpot = (p, list) => list.some(([x, y]) => p.pos && x === p.pos.x && y === p.pos.y);
function buffOf(s, p) {
  const q = p4State(s), b = p && q.buffs[p.id];
  return b && b.until >= (b.from || 0) ? b : null;
}
const fishOf = (s, p) => (p4State(s).catch || {})[p.id] || 0;
function teamMeal(ctx, s, p, kind) {
  const q = p4State(s), m = TEAM_MEALS[kind];
  if (!m || !onSpot(p, MAP.CAMPS) || !canStrike(ctx, p) || fishOf(s, p) < m.fish) return false;
  const r = ctx.match.roundNumber;
  q.catch[p.id] -= m.fish;
  const team = heroes(ctx).filter((u) => u.alive && !u.summon && (u.id === p.id || !ctx.combat.sameTeam || ctx.combat.sameTeam(u, p)));
  for (const u of team) {
    q.buffs[u.id] = { kind: kind === "grill" ? "mend" : "feast", from: r, until: r + CAMP_TURNS - 1 };
    if (kind === "grill" && ctx.combat.healHp) ctx.combat.healHp(u, 2);
    ctx.fx("camp_meal", { id: u.id, meal: kind, x: p.pos.x, y: p.pos.y, quiet: u.id !== p.id });
  }
  ctx.bump();
  ctx.log(`🏕️ ${p.name} ทำ${m.name} — ทั้งทีม ${team.length} คนได้กิน`);
  ctx.useStrike(p, 1.4);
  return true;
}
// พักแคมป์ (ผู้ใช้สั่ง 2026-11-12 "ทำทั้งหมด" · ตัวเลข Claude ตั้ง): ต้นเทิร์นกลางคืน ผู้เล่นที่อยู่ในวงไฟแคมป์ (ปีศาจเข้าไม่ได้) ฟื้นเลือด CAMP_REST
const CAMP_REST = 1;
function campRest(ctx, s) {
  if (!s.night || !ctx.combat.healHp) return 0;
  const list = [];
  for (const p of heroes(ctx)) {
    if (!p.alive || !p.pos || !XT.lightSafe(HH.H(), p.pos.x, p.pos.y)) continue;
    if (!(ctx.combat.healHp(p, CAMP_REST) > 0)) continue;
    list.push({ id: p.id, x: p.pos.x, y: p.pos.y });
  }
  if (list.length) { ctx.fx("camp_rest", { list }); ctx.bump(); }
  return list.length;
}
function campMeal(ctx, s, p, kind) {
  if (TEAM_MEALS[kind]) return teamMeal(ctx, s, p, kind);
  const q = p4State(s);
  if (!CAMP_MEALS[kind] || !onSpot(p, MAP.CAMPS) || !canStrike(ctx, p) || (q.campCd[p.id] || 0) > ctx.match.roundNumber) return false;
  const r = ctx.match.roundNumber;
  q.buffs[p.id] = { kind, from: r, until: r + CAMP_TURNS - 1 };
  q.campCd[p.id] = r + CAMP_CD;
  ctx.bump();
  ctx.fx("camp_meal", { id: p.id, meal: kind, x: p.pos.x, y: p.pos.y }); // ไม่ใช้ชื่อ kind (ctx.fx ใช้ kind เป็นชื่อเหตุการณ์)
  ctx.log(`🏕️ ${p.name} ตั้งแคมป์ — ${CAMP_MEALS[kind].name}`);
  ctx.useStrike(p, 1.2);
  return true;
}
// ---------- L17 ตกปลา ----------
function fish(ctx, s, p) {
  if (!onSpot(p, MAP.FISH) || !canStrike(ctx, p)) return false;
  const luck = XT.fishLuck(s), r = luck ? Math.random() * 0.75 : Math.random(); // พลังเสา Cleigne: ไม่เจอปลายักษ์ · เหรียญ ×2
  let result, amount = 0;
  if (r < 0.35) { // ได้ปลาเข้าถุง (ถือได้ FISH_MAX — เต็มแล้วกินเลย ฟื้นเลือด 2) · เอาไปทำอาหารทีมที่แคมป์
    const q = p4State(s); q.catch ||= {};
    result = "fish";
    if ((q.catch[p.id] || 0) < FISH_MAX) { q.catch[p.id] = (q.catch[p.id] || 0) + 1; amount = 0; }
    else amount = ctx.combat.healHp ? ctx.combat.healHp(p, 2) : 0;
  }
  else if (r < 0.6) { result = "coins"; amount = lazyShop().addGold(p, luck ? 6 : 3); }
  else if (r < 0.75) { result = "gold"; amount = lazyShop().addGold(p, luck ? 12 : 6); }
  else { result = "giant"; amount = ctx.damage(p, 2); }
  ctx.bump();
  ctx.fx("fish", { id: p.id, x: p.pos.x, y: p.pos.y, result, amount });
  ctx.log(result === "fish" ? (amount ? `🎣 ${p.name} ตกได้ปลา (ถุงเต็ม — กินเลย ฟื้นเลือด)` : `🎣 ${p.name} ตกได้ปลา (มี ${fishOf(s, p)})`) : result === "giant" ? `🎣 ${p.name} โดนปลายักษ์ลากลงน้ำ -${amount}` : `🎣 ${p.name} ตกได้${result === "gold" ? "ปลาทอง" : "เหรียญ"} ${amount}`);
  ctx.useStrike(p, 1.6);
  return true;
}
// ---------- L18 สุสานราชวงศ์ ----------
function tombNear(ctx, s, p) {
  const q = p4State(s);
  return MAP.TOMBS.findIndex(([x, y], i) => !q.tombs[i] && ctx.adjacent(p, x, y));
}
function hasArm(s, p) { const q = p4State(s), a = p && q.arms[p.id]; return !!a; }
const ARMIGER = { atk: 2, turns: 3, heal: 3 };
const armigerOn = (ctx, s) => (p4State(s).armiger ?? -1) >= ctx.match.roundNumber;
const armRec = (s, p) => (p ? p4State(s).arms[p.id] || null : null);
function openTomb(ctx, s, p) {
  const q = p4State(s), i = tombNear(ctx, s, p);
  if (i < 0 || !canStrike(ctx, p)) return false; // ถืออยู่แล้ว = เปลี่ยนเป็นอันใหม่
  const a = AR.armAt(i);
  q.tombs[i] = true;
  q.arms[p.id] = { until: ctx.match.roundNumber + ARM_TURNS - 1, w: a.id };
  ctx.bump();
  ctx.fx("tomb_open", { id: p.id, x: MAP.TOMBS[i][0], y: MAP.TOMBS[i][1], w: a.id });
  ctx.log(`⚱️ ${p.name} ได้อาวุธจักรพรรดิ ${a.name} — ${a.desc}`);
  // เปิดครบ 13 สุสาน = Armiger (ผู้ใช้สั่ง 2026-11-12 · Claude ตั้ง): ทั้งทีมตี +2 3 เทิร์น + ฟื้นเลือด 3
  if (!q.armiger && q.tombs.every(Boolean)) {
    q.armiger = ctx.match.roundNumber + ARMIGER.turns - 1;
    for (const o of heroes(ctx)) if (o.alive && ctx.combat.healHp) ctx.combat.healHp(o, ARMIGER.heal);
    ctx.fx("armiger", { by: p.id, ids: heroes(ctx).map((o) => o.id) });
    ctx.log(`👑 อาวุธจักรพรรดิครบ 13 อัน — Armiger! ทั้งทีมตี +${ARMIGER.atk} ${ARMIGER.turns} เทิร์น`);
  }
  ctx.useStrike(p, 1.6);
  return true;
}
// ตาที่ตีด้วยอาวุธหลวง → เสียเลือด 1 (ไม่ถึงตาย) · เรียกตอนจบตา
function armDrain(ctx, s, p) {
  const q = p4State(s);
  if (!p || !p.alive || !hasArm(s, p) || !p.didAttackRound || !AR.drains(armRec(s, p))) return; // Sword of the Father ไม่ดูดเลือด
  const key = `${p.id}|${ctx.match.roundNumber}`;
  if (q.armPaid[key]) return;
  q.armPaid[key] = true;
  if ((p.hp || 0) > 1) { p.hp -= 1; ctx.fx("royal_drain", { id: p.id, x: p.pos ? p.pos.x : 0, y: p.pos ? p.pos.y : 0 }); }
}
// ---------- L19 ค่าหัว ----------
function shopNear(ctx, p) {
  if (!p || !p.pos) return false;
  const keys = lazyShop().shopTiles();
  for (const k of keys) { const [x, y] = k.split(",").map(Number); if (ctx.adjacent(p, x, y)) return true; }
  return false;
}
function takeBounty(ctx, s, p) {
  const q = p4State(s);
  if (!shopNear(ctx, p) || q.bounty[p.id] || !ctx.action.canAct(p)) return false;
  const side = SC.sideOf(p);
  const foes = Object.values(ctx.match.players).filter((u) => u.alive && !u.summon && !u.duoOf && SC.sideOf(u) !== side);
  const kinds = ["daemon"];
  if (mobsOf(ctx, "beast").length) kinds.push("beast");
  if (mobsOf(ctx, "magitek").length) kinds.push("magitek");
  if (foes.length) kinds.push("player", "player");
  const kind = ctx.pick(kinds, 1)[0];
  const target = kind === "player" ? ctx.pick(foes, 1)[0] : null;
  q.bounty[p.id] = { kind, target: target ? target.id : null, name: target ? target.name : BOUNTY[kind].name, gold: BOUNTY[kind].gold };
  ctx.bump();
  ctx.fx("hunt_board", { id: p.id, bounty: kind, target: target ? target.id : null });
  ctx.log(`📜 ${p.name} รับค่าหัว: ${q.bounty[p.id].name}`);
  return true;
}
function huntDone(ctx, s, by, kind, victimId = null) {
  if (!by || !s) return;
  const q = p4State(s), b = q.bounty[by.id];
  if (!b || b.kind !== kind || (kind === "player" && b.target !== victimId)) return;
  delete q.bounty[by.id];
  const got = lazyShop().addGold(by, b.gold);
  ctx.fx("hunt_done", { id: by.id, bounty: kind, gold: got });
  ctx.log(`📜 ${by.name} ปิดค่าหัว ${b.name} ได้ ${got} เหรียญ`);
}
function onKill(ctx, st, victim, killerId) {
  const s = st && st.eos;
  if (!s || !victim || victim.summon) return;
  E.noteDeathAt(s, victim); // ดวงวิญญาณที่ช่องที่ล้ม (ช่วยเพื่อนฟื้นเร็ว)
  SC.noteDeaths(ctx, s); // นับการล้มทันที (ผู้ใช้ 2026-11-14 — เดิมรอจบตา/ต้นเทิร์นหน้า)
  const by = killerId && ctx.match.players[killerId];
  if (by && by.id !== victim.id) huntDone(ctx, s, by, "player", victim.id);
}
// ---------- ต้นเทิร์น: หมดอายุบัฟ/อาวุธ · ปลาย่างฟื้นเลือด ----------
function p4PreRound(ctx, s, turn) {
  const q = p4State(s), r = turn;
  for (const [pid, b] of Object.entries(q.buffs)) {
    if (b.until < r) { delete q.buffs[pid]; continue; }
    const p = ctx.match.players[pid];
    if ((b.kind === "mend" || b.kind === "feast") && p && p.alive && ctx.combat.healHp) ctx.combat.healHp(p, 1);
  }
  for (const [pid, a] of Object.entries(q.arms)) if (a.until < r) delete q.arms[pid];
  for (const k of Object.keys(q.armPaid)) if (Number(k.split("|")[1]) < r - 1) delete q.armPaid[k];
  return trainTurn(ctx, s, turn);
}
function p4AtkBonus(s, p) {
  const b = buffOf(s, p);
  return (b && (b.kind === "atk" || b.kind === "feast") ? 1 : 0) + AR.atkOf(armRec(s, p)) + ((p4State(s).armiger ?? -1) >= (s.roundNow || 0) ? ARMIGER.atk : 0); // อาวุธจักรพรรดิ: ตีเพิ่มตามอาวุธ · Armiger
}
function p4MovBonus(s, p) { const b = buffOf(s, p); return b && (b.kind === "mov" || b.kind === "feast") ? 1 : 0; }
function p4Hud(ctx, s, p, out) {
  const q = p4State(s);
  if (tunnelOf(p)) {
    const t = tunnelOf(p), dest = canTravel(ctx, s, p) ? [tileFree(ctx, s, t[1].x, t[1].y, p.id) ? t[1] : freeNear(ctx, s, t[1].x, t[1].y, 2, p.id)].filter(Boolean) : [];
    out.push({ key: "fd:tunnel", icon: "🕳️", name: "อุโมงค์", disabled: !dest.length }); // ไม่มี tiles = กดแล้วไปปากอีกฝั่งทันที
  }
  if (onSpot(p, MAP.DOCKS)) {
    const dest = canTravel(ctx, s, p) ? travelTiles(ctx, s, p, MAP.DOCKS.map(tl)) || [] : [];
    out.push({ key: "fd:gondola", icon: "🛶", name: "กอนโดลา", disabled: !dest.length, tiles: dest });
  }
  const tr = tramOff(ctx) ? null : tramHere(p);
  if (tr) {
    const left = tramLeft(ctx, s, p), cd = left > 0 ? 0 : tramCd(ctx, s, p);
    for (const t of TRAM_STOPS) {
      if (t === tr) continue;
      out.push({ key: `fd:tram:${t.zone}`, icon: "🚋", name: SC.ZONE_NAMES[t.zone] || t.zone, count: left, cd, disabled: !canTravel(ctx, s, p) || !tramDest(ctx, s, p, t) || left <= 0 });
    }
  }
  if (onSpot(p, MAP.CAMPS)) {
    const off = !canStrike(ctx, p) || (q.campCd[p.id] || 0) > ctx.match.roundNumber;
    for (const [k, m] of Object.entries(CAMP_MEALS)) out.push({ key: `fd:camp:${k}`, icon: m.icon, name: m.name, desc: m.desc, disabled: off });
    const has = fishOf(s, p);
    for (const [k, m] of Object.entries(TEAM_MEALS)) if (has > 0) out.push({ key: `fd:camp:${k}`, icon: m.icon, name: m.name, desc: m.desc, count: m.fish, disabled: !canStrike(ctx, p) || has < m.fish });
  }
  if (onSpot(p, MAP.FISH)) out.push({ key: "fd:fish", icon: "🎣", name: "ตกปลา", disabled: !canStrike(ctx, p) });
  { const ti = tombNear(ctx, s, p); if (ti >= 0) { const a = AR.armAt(ti); out.push({ key: "fd:tomb", icon: "⚔️", name: a.name, desc: `${ARM_TURNS} เทิร์น: ${a.desc}${a.noDrain ? "" : " · ตีแล้วเสียเลือด 1"}`, disabled: !canStrike(ctx, p) }); } }
  if (shopNear(ctx, p) && !q.bounty[p.id]) out.push({ key: "fd:bounty", icon: "📜", name: "ค่าหัว", disabled: !ctx.action.canAct(p) });
}
function p4Action(ctx, s, p, key, tile) {
  if (key === "fd:tunnel") return travel(ctx, s, p, tile, "tunnel");
  if (key === "fd:gondola") return travel(ctx, s, p, tile, "gondola");
  if (typeof key === "string" && key.startsWith("fd:tram:")) return rideTram(ctx, s, p, key.slice(8));
  if (key === "fd:fish") return fish(ctx, s, p);
  if (key === "fd:tomb") return openTomb(ctx, s, p);
  if (key === "fd:bounty") return takeBounty(ctx, s, p);
  if (typeof key === "string" && key.startsWith("fd:camp:")) return campMeal(ctx, s, p, key.slice(8));
  return null;
}
function p4Public(ctx, s) {
  const q = p4State(s);
  return {
    rail: { y: MAP.RAIL_Y, stations: MAP.STATIONS.map(tl), next: q.trainNext, warn: !!q.trainWarn, dir: q.trainDir },
    tunnels: MAP.TUNNELS.map((pair) => pair.map(tl)), docks: MAP.DOCKS.map(tl), camps: MAP.CAMPS.map(tl), fish: MAP.FISH.map(tl),
    tombs: MAP.TOMBS.map(([x, y], i) => { const a = AR.armAt(i); return { x, y, open: !!q.tombs[i], w: a.id, name: a.name, desc: a.desc, img: AR.imgOf(a.id) }; }),
    armiger: (q.armiger ?? -1) >= ctx.match.roundNumber ? q.armiger : null,
    arms: Object.fromEntries(Object.entries(q.arms).map(([pid, r]) => { const a = AR.defOf(r); return [pid, { w: a.id, name: a.name, img: AR.imgOf(a.id), until: r.until }]; })),
    trams: tramOff(ctx) ? [] : TRAM_STOPS.map((t) => ({ ...t })),
  };
}
function p4Badges(s, p, badges) {
  const q = p4State(s), b = buffOf(s, p);
  const bm = b && (CAMP_MEALS[b.kind] || (b.kind === "feast" ? TEAM_MEALS.feast : null));
  if (bm) badges.push({ key: `meal_${b.kind}`, icon: bm.icon, label: bm.name, cls: "bg-orange-200 text-gray-900" });
  const fc = (q.catch || {})[p.id] || 0;
  if (fc) badges.push({ key: "fish_bag", icon: "🐟", label: `ปลา ×${fc}`, cls: "bg-sky-200 text-gray-900" });
  if ((q.armiger ?? -1) >= (s.roundNow || 0)) badges.push({ key: "armiger", icon: "👑", label: "Armiger", cls: "bg-sky-300 text-gray-900" });
  if (hasArm(s, p)) badges.push({ key: "royal_arm", icon: "⚔️", label: AR.defOf(armRec(s, p)).name, cls: "bg-indigo-300 text-gray-900" });
  const h = q.bounty[p.id];
  if (h) badges.push({ key: "bounty", icon: BOUNTY[h.kind].icon, label: h.name, cls: "bg-amber-300 text-gray-900" });
}

// Object.assign (ไม่แทน module.exports) — ไฟล์ eos* อ้างกันเองแบบวนได้
Object.assign(module.exports, {
  TRAIN_EVERY, TRAIN_DMG, CAMP_TURNS, CAMP_CD, ARM_TURNS, FISH_MAX, TEAM_MEALS, BOUNTY, onRail, p4State, trainTurn, TRAM_STOPS, TRAM, tramOff,
  rideTram, campRest, armRec, armDrain, huntDone, onKill, p4PreRound, p4AtkBonus, p4MovBonus, p4Hud, p4Action, p4Public, p4Badges,
});

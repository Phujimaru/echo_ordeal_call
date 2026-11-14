// Road Trip: การต่อสู้ (contract §2) — วงจรเดิมทั้งหมด (จั่ว → ลำดับเดิน → ตาเดิน) บนกระดานถนน (RT_ROAD) / บนรถตู้ (RT_ONVAN)
//  ambush/elite/boss: รถตู้จอดกลางกระดาน (สิ่งกีดขวาง rt_van) · ผู้เล่นเกิดข้างรถ · มอนโผล่ขอบหน้า/หลัง · มอนหมด = ชนะ
//  onvan: ผู้เล่นเกิดในรถ (ช่อง van) · ทุกต้นเทิร์น (ตั้งแต่เทิร์น 2) ถนนเลื่อน: ยูนิตนอกช่อง van ถอยหลัง scroll ช่อง
//   ตกขอบหลัง = มอนหายไป / ผู้เล่นเสีย 2 แล้ววางกลับท้ายรถ · ช่องคนขับว่างตอนจบเทิร์น = รถส่าย (รถ −2) · รอดครบ rounds เทิร์น หรือฆ่าหมด = ชนะ
//  ป้อมปืน (อัปเกรด): ต้นเทิร์นยิงมอนใกล้รถ 1 นัด ดาเมจ = ขั้น · กันชน: มอนที่ติดหน้ารถโดนชนต้นเทิร์น
//  จบสู้: ตัดทุกลำดับที่ค้าง (RT.cancelCombatFlow) + fx combatEnd → ขับต่อ · ผู้เล่นล้มหมด / รถพัง = จบเกม
const match = require("../match");
const Board = require("../board");
const Maps = require("./maps");
const Van = require("./van");
const Mobs = require("./mobs");
const { diffOf } = require("./diff");

const H = () => require("./index");
const L = {
  action: () => require("../phases/action"), timers: () => require("../timers"), draw: () => require("../phases/draw"),
  summon: () => require("../summon"), combat: () => require("../combat"), shop: () => require("../shop"), attack: () => require("../phases/attack"),
};
const K = Board.key;
const FALL_DMG = 2, SWERVE_DMG = 2, MOB_SECS = 1.6;
const REWARD = { base: 3, perKm: 25, elite: 5, boss: 10 };
const DOG = { hp: 6, armor: 1, mov: 5, atk: 2 };
const TURRET_RANGE = 4;
// ผู้โจมตีสมมติของรถตู้ (ป้อมปืน/กันชน) — ให้ attack.skillDodge ทอยหลบได้ตามกติกา (ไม่มีแม่นยำ)
const VAN_SRC = { id: "rtvan", name: "รถตู้", characterId: "rtvan", statuses: {}, statusAmt: {}, alive: true };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// เวลาพักช่วงมอนเดิน = ให้ภาพฝั่ง client (rtTimeline.js) เล่นจบก่อนตาผู้เล่นเริ่ม — มอนทั่วไปบีบรวม ≤ 6 วิ · ท่าบอสเล่นเต็ม ~2.4 วิ/ท่า
function mobSecs(out) {
  const seq = Array.isArray(out.seq) ? out.seq : [];
  const bossMoves = seq.filter((e) => e && e.k === "bossMove").length;
  const ids = new Set(seq.filter((e) => e && (e.k === "mobMove" || e.k === "mobHit") && !e.boss).map((e) => e.id));
  const secs = 1.2 + Math.min(6, ids.size * 0.9) + bossMoves * 2.4;
  return Math.max(MOB_SECS, Math.min(12, secs));
}
function begin(kind = "ambush", opts = {}) {
  const RT = H(), rt = match.roadtrip;
  if (!rt || rt.phase === "over") return false;
  const onvan = kind === "onvan";
  const area = onvan ? Maps.RT_ONVAN : Maps.RT_ROAD;
  RT.setPhase("combat", 0);
  rt.fights++;
  rt.legs = 0;
  rt.fork = null; rt.event = null; rt.stop = null;
  rt.van.rearOpen = false;
  rt.combat = { kind, area, round: 0, rounds: onvan ? 4 + Math.min(3, Math.floor(rt.km / 100)) : 0, scroll: onvan ? 1 : 0, warn: null, preDone: null, survived: false };
  L.shop().clearShops();
  match.board = null;
  L.action().placeOnBoard(area); // ลบยูนิตที่ถูกเรียกเก่าทั้งหมด → เกิดมอน/หมาหลังจากนี้
  if (onvan) keepInVan();
  spawnWave(rt, kind, opts.mobType || null);
  if (rt.dog.on) spawnDog(rt);
  applyBuffs(rt);
  RT.fx("combatStart", { kind });
  const boss = kind === "boss" ? Mobs.mobs().find((m) => m.summon.boss) : null;
  match.lastLog.push(boss ? `👹 ${boss.name}ปรากฏตัว!` : onvan ? "⚠️ มอนไล่ล่ารถตู้!" : kind === "elite" ? "💀 หัวหน้ามอนดักทาง!" : "⚔️ มอนดักทาง!");
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  L.timers().startPhaseTimer(kind === "boss" ? RT.SECS.bossIntro : RT.SECS.combatIntro, startRound);
  RT.broadcast();
  return true;
}
function startRound() { if (H().inCombat()) L.draw().dealRound(); }
// ผู้เล่นทุกคนอยู่บนช่อง van (จุดเกิดของแผนที่ควรอยู่ในรถอยู่แล้ว)
function keepInVan() {
  const d = Maps.defs[Maps.RT_ONVAN], van = new Set((d.vanTiles || []).map(([x, y]) => K(x, y)));
  for (const p of Object.values(match.players)) {
    if (!p.alive || !p.pos || van.has(K(p.pos.x, p.pos.y))) continue;
    const t = (d.vanTiles || []).find(([x, y]) => L.action().tileFree(x, y, p.id));
    if (t) p.pos = { x: t[0], y: t[1] };
  }
}
// ---------- สู้บนรถตู้: ฝั่งผู้เล่นอยู่ได้แค่ในรถ (ผู้ใช้แจ้ง 2026-11-14 "เดินออกนอกรถไปลอยบนถนน / ออกทางท้ายโดยไม่เปิดประตู") ----------
//  ผู้เล่น + ยูนิตของผู้เล่น (ตัวที่สองของระบบคู่ · ร่างแยก · หมา) = ช่องถนนเป็นสิ่งกีดขวาง (action.boardBlocked → RT.offVan)
//  ประตูท้ายให้แค่ระยะ +1 ไม่ได้ให้ออกนอกรถ · มอนยังกระโดดขึ้นรถได้
//  ตาข่ายกันพลาด: สกิลพุ่ง/วาร์ป/ผลัก/กระเด็นที่ส่งไปลงถนน = ร่วงจากรถ (เสีย FALL_DMG แล้วกลับท้ายรถ) — เช็คตอนจบตาของแต่ละตัว ต้นเทิร์น และจบเทิร์น
const vanKeys = () => new Set(((Maps.defs[Maps.RT_ONVAN] || {}).vanTiles || []).map(([x, y]) => K(x, y)));
function onvanNow() { const rt = match.roadtrip; return !!(H().inCombat() && rt && rt.combat && rt.combat.kind === "onvan" && match.board && match.board.area === Maps.RT_ONVAN); }
function playerSide(u) { return !!u && !Mobs.isMob(u) && !(u.summon && (u.summon.rtWreck || u.summon.side === "rtwreck")); }
// ช่องที่ยูนิตนี้ยืน/เดินผ่านไม่ได้เพิ่ม (Set-like) — null = ไม่จำกัด
function offVan(selfId) {
  if (!selfId || !onvanNow()) return null;
  const u = match.players[selfId];
  if (!playerSide(u)) return null;
  const van = vanKeys();
  return { has: (k) => !van.has(k) };
}
// ช่องว่างในรถที่ใกล้จุดนี้สุด (rear = ท้ายรถก่อน) — ใช้วาง/ฟื้น/เรียกยูนิตตอนสู้บนรถตู้
function vanSpot(near, selfId = null, rear = false) {
  const d = Maps.defs[Maps.RT_ONVAN] || {};
  const list = (rear ? (d.rearTiles || []).concat(d.vanTiles || []) : (d.vanTiles || []).slice())
    .filter(([x, y]) => L.action().tileFree(x, y, selfId));
  if (!list.length) return null;
  if (near && !rear) list.sort((a, b) => (Math.abs(a[0] - near.x) + Math.abs(a[1] - near.y)) - (Math.abs(b[0] - near.x) + Math.abs(b[1] - near.y)));
  return { x: list[0][0], y: list[0][1] };
}
// ช่องสำหรับวางยูนิตฝั่งผู้เล่นใกล้ near (บนรถตู้ = ในรถเท่านั้น · ที่อื่น = ช่องว่างใกล้สุด)
function placeSpot(near, selfId = null) { return onvanNow() ? vanSpot(near, selfId) : (near ? L.action().nearFreeTile(near, selfId) : null); }
// ร่วงจากรถ: ยูนิตของผู้เล่นเสีย FALL_DMG แล้วกลับท้ายรถ (ยูนิตที่ถูกเรียก = หายไป) → true
function dropOff(u, out = null) {
  const from = u.pos ? { ...u.pos } : null;
  if (out) out.falls.push({ id: u.id, from, mob: false });
  H().fx("fall", { id: u.id, from });
  if (u.summon) { L.summon().remove(u); return true; }
  L.combat().dealMixed(u, FALL_DMG);
  H().settle(u);
  if (u.alive) {
    const d = Maps.defs[Maps.RT_ONVAN] || {};
    u.pos = null;
    u.pos = vanSpot(null, u.id, true) || (d.driverTile ? L.action().nearFreeTile({ x: d.driverTile[0], y: d.driverTile[1] }, u.id) : null);
  }
  match.lastLog.push(`🛣️ ${u.name} ร่วงจากรถ -${FALL_DMG}`);
  return true;
}
// ทุกยูนิตฝั่งผู้เล่นที่อยู่นอกรถ = ร่วง
function enforceVan(out = null) {
  if (!onvanNow()) return 0;
  const van = vanKeys();
  let n = 0;
  for (const u of Object.values(match.players)) if (u.alive && u.pos && playerSide(u) && !van.has(K(u.pos.x, u.pos.y))) { dropOff(u, out); n++; }
  return n;
}
function spawnWave(rt, kind, lead) {
  const d = Maps.defs[match.board.area] || {};
  const heroes = Object.values(match.players).filter((p) => p.alive && !p.summon && p.pos).length;
  let n = Mobs.waveSize(rt, kind, heroes);
  const pool = Mobs.poolFor(rt, kind);
  if (lead && kind === "onvan" && !Mobs.CHASERS.includes(lead)) lead = null; // รถวิ่ง = เฉพาะมอนที่ไล่ทัน
  const entries = shuffle((d.mobEntries || []).map(([x, y]) => ({ x, y })));
  const taken = new Set();
  const spot = () => {
    for (const t of entries) if (!taken.has(K(t.x, t.y)) && L.action().tileFree(t.x, t.y)) { taken.add(K(t.x, t.y)); return t; }
    for (const t of entries) { const f = L.action().nearFreeTile(t); if (f && !taken.has(K(f.x, f.y))) { taken.add(K(f.x, f.y)); return f; } }
    return null;
  };
  const born = match.roundNumber + 1;
  const out = [];
  // บอสหมุนตามหลัก (แม็กซ์ เวอร์สแตปเพน → อัศวินเงามรณะ → จอร์มุนกันด์ → วนใหม่ · แกร่งขึ้นตามรอบผ่าน Mobs.scale)
  //  หลัก 50 = ตัวที่ 0 · 100 = 1 · 150 = 2 · 200 = 0 … (rt.bossKm ตั้งตอนข้ามหลัก — dev/ไม่มี = ใช้ระยะตอนนี้)
  if (kind === "boss") { const type = Mobs.bossOf(bossIndex(rt)); rt.bossKm = null; rt.combat.boss = type; const m = Mobs.spawn(rt, type, spot(), { born }); if (m) out.push(m); }
  for (let i = 0; i < n; i++) {
    const type = i === 0 && lead ? lead : pool[Math.floor(Math.random() * pool.length)];
    const m = Mobs.spawn(rt, type, spot(), { elite: kind === "elite" && i === 0, born });
    if (m) out.push(m);
  }
  Mobs.assignRoles(out); // บทบาท: ล่าผู้เล่น / ป่วนรถ (~1 ใน 4)
  H().fx("mobSpawn", { list: out.map((m) => ({ id: m.id, type: m.summon.mobType, x: m.pos.x, y: m.pos.y, elite: !!m.summon.elite, role: m.summon.role || "hunter" })) });
  return out;
}
// ---------- สู้บนรถตู้: ให้ตัวประชิดได้สู้ (ผู้ใช้เลือกครบทุกข้อ 2026-11-14) ----------
//  มอนกระโดดขึ้นรถได้ (BFS ของมอนเดินเข้าช่อง van ได้อยู่แล้ว — ตัวล่าเข้าไปหาผู้เล่นในรถ · ตัวป่วนรถอยู่ข้างนอกทุบรถ)
//  หน้าต่างข้าง windowTiles: ตีออกนอกรถได้ไกลอย่างน้อย 2 (RT.rangeMod)
//  rt:swerve {side} (คนนั่งช่องคนขับ · ตาตัวเอง · คูลดาวน์ 2 เทิร์น): ปาดรถชนมอนบนถนนแถวข้างรถฝั่งนั้น 2 + ขั้นกันชน (หลบได้) กระเด็นออก 1 · กันชน 0 = รถเสีย 1 · คนบนหลังคาเสี่ยงร่วง 25%
//  rt:turret {x,y} (ป้อมปืน ≥ 1 · ยืนช่องซันรูฟหรือบนหลังคา · ตาตัวเอง ครั้งเดียวต่อตา): ยิงมอนที่ห่างรถ ≤ 4 ดาเมจ = ขั้น + 1 (หลบได้)
//  rt:roof (ยืนช่องซันรูฟ · ตาตัวเอง): ขึ้น/ลงหลังคา — ทีละคน · ระยะ +2 · โดนได้แค่ตัวบิน/บอส · ถนนกระตุกต้นเทิร์น/คนขับปาดรถ = ร่วง 25%
const SWERVE = { cd: 2, dmg: 2 }, ROOF_FALL = 0.25, TURRET_MANUAL_RANGE = 4;
const tileIs = (list, pos) => !!list && !!pos && list.some(([x, y]) => x === pos.x && y === pos.y);
function myTurn(p) {
  const u = match.players[require("../duo").controlledId(p.id)] || p;
  return L.action().canAct(u) ? u : null;
}
function swerve(p, side) {
  const RT = H(), rt = match.roadtrip, c = rt.combat;
  if (!onvanNow() || (side !== "left" && side !== "right")) return false;
  const u = myTurn(p), d = Maps.defs[Maps.RT_ONVAN];
  if (!u || !tileIs([d.driverTile], u.pos) || (c.swerveReady || 0) > match.roundNumber) return false;
  const ys = d.vanTiles.map((t) => t[1]), xs = d.vanTiles.map((t) => t[0]);
  const y = side === "left" ? Math.min(...ys) - 1 : Math.max(...ys) + 1, dy = side === "left" ? -1 : 1;
  const x0 = Math.min(...xs), x1 = Math.max(...xs), lv = Van.statOf(rt.van, "bumper");
  const hits = [];
  for (const m of Mobs.mobs()) {
    if (m.pos.y !== y || m.pos.x < x0 || m.pos.x > x1) continue;
    if (L.attack().skillDodge(u, m, "ปาดรถ")) { hits.push({ id: m.id, dmg: 0, dodge: true }); continue; }
    const before = m.hp + (m.armor || 0);
    L.combat().withEffectSource(u, () => { L.combat().dealMixed(m, SWERVE.dmg + lv); H().settle(m); });
    if (m.alive && m.pos && L.action().tileFree(m.pos.x, m.pos.y + dy, m.id)) m.pos = { x: m.pos.x, y: m.pos.y + dy };
    hits.push({ id: m.id, dmg: before - (m.alive ? m.hp + (m.armor || 0) : 0) });
  }
  if (!lv) RT.hurtVan(1, "swerve");
  c.swerveReady = match.roundNumber + SWERVE.cd + 1; // ใช้ได้อีกหลังผ่านไป 2 เทิร์น
  if (match.action) match.action.locked = true;
  RT.fx("swerveRam", { id: u.id, side, tiles: Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ x: x0 + i, y })), hits });
  match.lastLog.push(`🚐 ${u.name} ปาดรถ${side === "left" ? "ซ้าย" : "ขวา"}${hits.length ? ` ชนมอน ${hits.filter((h) => !h.dodge).length}` : ""}`);
  roofLurch("swerve");
  if (require("../phases/endTurn").gameOver()) return true;
  return true;
}
function fireTurret(p, x, y) {
  const RT = H(), rt = match.roadtrip, d = Maps.defs[Maps.RT_ONVAN];
  const lv = Van.statOf(rt.van, "turret");
  if (!onvanNow() || !lv || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  const u = myTurn(p);
  if (!u || !(tileIs([d.hatchTile], u.pos) || (u.rtRoof && rt.combat.roofId === u.id)) || u.rtTurretAt === match.roundNumber) return false;
  const m = Mobs.mobs().find((o) => o.pos.x === x && o.pos.y === y);
  if (!m || vanDist(m.pos) > TURRET_MANUAL_RANGE) return false;
  u.rtTurretAt = match.roundNumber;
  let dmg = 0, dodge = false;
  if (L.attack().skillDodge(u, m, "ป้อมปืน")) dodge = true;
  else { const before = m.hp + (m.armor || 0); L.combat().withEffectSource(u, () => { L.combat().dealMixed(m, lv + 1); H().settle(m); }); dmg = before - (m.alive ? m.hp + (m.armor || 0) : 0); }
  RT.fx("turretShot", { id: u.id, target: m.id, x, y, dmg, dodge });
  match.lastLog.push(`🔫 ${u.name} ยิงป้อมปืนใส่ ${m.name}${dodge ? " — พลาด" : ` -${dmg}`}`);
  require("../phases/endTurn").gameOver();
  return true;
}
function toggleRoof(p) {
  const RT = H(), rt = match.roadtrip, c = rt.combat, d = Maps.defs[Maps.RT_ONVAN];
  if (!onvanNow()) return false;
  const u = myTurn(p);
  if (!u || !tileIs([d.hatchTile], u.pos)) return false;
  if (u.rtRoof) { u.rtRoof = false; c.roofId = null; RT.fx("roof", { id: u.id, on: false }); return true; }
  if (c.roofId && match.players[c.roofId] && match.players[c.roofId].alive && match.players[c.roofId].rtRoof) return false; // ทีละคน
  u.rtRoof = true; c.roofId = u.id;
  if (match.action) match.action.locked = true; // ปีนขึ้นแล้วเดินต่อไม่ได้ในตานี้
  RT.fx("roof", { id: u.id, on: true });
  match.lastLog.push(`🧗 ${u.name} ขึ้นหลังคารถตู้`);
  return true;
}
// คนบนหลังคา: ลงจากช่องซันรูฟ/ตาย = ไม่อยู่บนหลังคาแล้ว · ถนนกระตุก/ปาดรถ = ร่วง 25%
function roofSync() {
  const rt = match.roadtrip, c = rt && rt.combat, d = Maps.defs[Maps.RT_ONVAN];
  if (!c || !c.roofId) return;
  const u = match.players[c.roofId];
  if (!u || !u.alive || !u.rtRoof || !tileIs([d.hatchTile], u.pos)) { if (u) u.rtRoof = false; c.roofId = null; }
}
function roofLurch(why) {
  roofSync();
  const rt = match.roadtrip, c = rt && rt.combat;
  const u = c && c.roofId && match.players[c.roofId];
  if (!u || Math.random() >= ROOF_FALL) return false;
  u.rtRoof = false; c.roofId = null;
  H().fx("roofFall", { id: u.id, why });
  dropOff(u);
  return true;
}
// ปุ่ม HUD ต่อผู้เล่น (ตาตัวเอง) — { [pid]: ["swerve", "turret", "roof", "rear"] }
function actionsOf() {
  const rt = match.roadtrip, c = rt && rt.combat, out = {};
  if (!c || !onvanNow()) return out;
  const d = Maps.defs[Maps.RT_ONVAN];
  for (const p of H().realPlayers()) {
    const u = myTurn(p);
    if (!u || !u.pos) continue;
    const list = [];
    if (tileIs([d.driverTile], u.pos) && (c.swerveReady || 0) <= match.roundNumber) list.push("swerve");
    const onHatch = tileIs([d.hatchTile], u.pos);
    if (Van.statOf(rt.van, "turret") >= 1 && (onHatch || u.rtRoof) && u.rtTurretAt !== match.roundNumber) list.push("turret");
    if (onHatch && (!c.roofId || c.roofId === u.id)) list.push("roof");
    if (tileIs(d.rearTiles, u.pos)) list.push("rear");
    if (list.length) out[p.id] = list;
  }
  return out;
}
function bossIndex(rt) { return Math.max(0, Math.floor((rt.bossKm || Math.max(50, rt.km)) / 50) - 1); }
function spawnDog(rt) {
  const owner = Object.values(match.players).find((p) => p.alive && !p.summon && p.pos);
  if (!owner) return null;
  const at = placeSpot(owner.pos);
  if (!at) return null;
  const dog = L.summon().spawn(owner, { kind: "rtDog", name: "หมาประจำปั๊ม", hp: DOG.hp, armor: DOG.armor, mov: DOG.mov, range: [1, 1], pos: at, img: "/roadtrip/mobs/dog.webp", color: "#d9a066", data: { rtDog: true, atk: DOG.atk } });
  dog.teamId = owner.teamId || "A";
  return dog;
}
// บัฟ/ดีบัฟ "สู้ครั้งหน้า" (กิจกรรมที่ปั๊ม · เหตุการณ์ถนน) — ใส่ตอนเริ่มสู้แล้วล้าง
function applyBuffs(rt) {
  const combat = L.combat();
  for (const p of Object.values(match.players)) {
    if (!p.alive || p.summon) continue;
    for (const b of [...(rt.buffs.team || []), ...(rt.buffs[p.id] || [])]) {
      if (b.debuff) combat.applyDebuff(p, b.key, b.amt, b.turns);
      else combat.applyBuff(p, b.key, b.amt, b.turns);
    }
  }
  rt.buffs = {};
}

// ---------- ต้นเทิร์น (draw.dealRound ก่อนแจกไพ่) ----------
function preRound(resume) {
  const RT = H(), rt = match.roadtrip, c = rt.combat;
  if (!c) return false;
  const turn = match.roundNumber + 1;
  if (c.preDone === turn) return false;
  c.preDone = turn;
  c.round++;
  const out = { moves: [], attacks: [], misses: [], van: [], charges: [], warns: [], falls: [], shots: [], rams: [] };
  if (c.kind === "onvan") enforceVan(out); // ตาข่ายกันพลาด: ใครหลุดออกนอกรถระหว่างตา = ร่วง
  if (c.kind === "onvan" && c.round > 1) roofLurch("lurch"); // ถนนกระตุกต้นเทิร์น — คนบนหลังคาร่วง 25%
  if (c.kind === "onvan" && c.round > 1) scroll(rt, c, out);
  if (c.kind !== "onvan") bumper(rt, out);
  const gone = Mobs.expireWrecks(); // ซากรถ F1 (บอสแม็กซ์โยน) ครบ 2 เทิร์นหาย
  if (gone.length) out.wrecksGone = gone;
  Mobs.actAll(rt, out);
  dogAct(rt, out);
  turret(rt, out);
  const busy = (out.wrecksGone || []).length || (out.wrecks || []).length || out.moves.length || out.attacks.length || out.misses.length || out.van.length || out.charges.length || out.warns.length || out.falls.length || out.shots.length || out.rams.length;
  if (busy) RT.fx("mobTurn", out);
  if (outcome()) return true; // รถพัง/ทุกคนล้ม/มอนหมดระหว่างช่วงนี้
  if (!busy) return false;
  match.cutsceneInfo = null;
  match.gameState = "CUTSCENE";
  L.timers().startPhaseTimer(mobSecs(out), resume);
  RT.broadcast();
  return true;
}
function vanSet() { const d = Maps.defs[match.board && match.board.area]; return new Set(((d && d.vanTiles) || []).map(([x, y]) => K(x, y))); }
function forwardOf(d) {
  if (!d || !d.driverTile || !d.rearTiles || !d.rearTiles.length) return [1, 0];
  const dx = d.driverTile[0] - d.rearTiles[0][0], dy = d.driverTile[1] - d.rearTiles[0][1];
  return Math.abs(dx) >= Math.abs(dy) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dy) || 1];
}
// ถนนเลื่อน: ยูนิตนอกรถถอยหลัง (ท้ายสุดก่อน — ช่องว่างให้ตัวหน้า)
function scroll(rt, c, out) {
  const d = Maps.defs[Maps.RT_ONVAN], van = vanSet(), [fx, fy] = forwardOf(d);
  const map = L.action().boardMap();
  // มอนที่ยังไม่เคยได้ตา (เพิ่งเกิด) ไม่ถูกถนนพาไป — ไม่งั้นมอนขอบหลังร่วงหายก่อนได้ขยับ (QA 2026-11-14)
  const units = Object.values(match.players).filter((p) => p.alive && p.pos && !van.has(K(p.pos.x, p.pos.y)) && !(Mobs.isMob(p) && !p.summon.acted))
    .sort((a, b) => (a.pos.x * fx + a.pos.y * fy) - (b.pos.x * fx + b.pos.y * fy));
  for (const u of units) {
    const from = { ...u.pos };
    let fell = false;
    for (let s = 0; s < c.scroll; s++) {
      const nx = u.pos.x - fx, ny = u.pos.y - fy;
      if (!Board.inBounds(map, nx, ny)) { fell = true; break; }
      if (van.has(K(nx, ny))) { // หน้ารถ: ถูกรถตู้ชน
        if (Mobs.isMob(u)) { const n = 1 + Van.statOf(rt.van, "bumper"); L.combat().dealMixed(u, n); out.rams.push({ id: u.id, dmg: n }); H().settle(u); }
        break;
      }
      if (!L.action().tileFree(nx, ny, u.id)) break;
      u.pos = { x: nx, y: ny };
    }
    if (fell) {
      if (!Mobs.isMob(u)) { u.pos = from; dropOff(u, out); continue; }
      out.falls.push({ id: u.id, from, mob: true });
      L.summon().remove(u);
      match.lastLog.push(`🛣️ ${u.name}ร่วงหลุดถนน`);
    } else if (u.pos.x !== from.x || u.pos.y !== from.y) out.moves.push({ id: u.id, from, to: { ...u.pos }, path: [from, { ...u.pos }], scroll: true });
  }
}
// กันชน (กระดานถนน): มอนที่ติดหน้ารถโดนชน (ขั้นกันชน)
function bumper(rt, out) {
  const lv = Van.statOf(rt.van, "bumper"), d = Maps.defs[match.board && match.board.area];
  if (!lv || !d || !d.vanBlock) return;
  const b = d.vanBlock, frontX = b.x1 + 1;
  for (const m of Mobs.mobs()) {
    if (m.pos.x !== frontX || m.pos.y < b.y0 || m.pos.y > b.y1) continue;
    if (L.attack().skillDodge(VAN_SRC, m, "กันชน")) { out.rams.push({ id: m.id, dmg: 0, dodge: true }); continue; } // หลบได้ (ทุกการโจมตีหลบได้)
    L.combat().dealMixed(m, lv);
    out.rams.push({ id: m.id, dmg: lv });
    H().settle(m);
  }
}
function vanCenter() {
  const d = Maps.defs[match.board && match.board.area];
  if (!d) return null;
  if (d.vanBlock) return { x: (d.vanBlock.x0 + d.vanBlock.x1) / 2, y: (d.vanBlock.y0 + d.vanBlock.y1) / 2 };
  if (d.vanTiles && d.vanTiles.length) { const xs = d.vanTiles.map((t) => t[0]), ys = d.vanTiles.map((t) => t[1]); return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; }
  return null;
}
// ระยะจากรถตู้ (ขอบรถจอด / ช่องในรถ) ถึงช่อง
function vanDist(pos) {
  const d = Maps.defs[match.board && match.board.area];
  if (!d || !pos) return Infinity;
  if (d.vanBlock) { const b = d.vanBlock; return Math.max(b.x0 - pos.x, 0, pos.x - b.x1) + Math.max(b.y0 - pos.y, 0, pos.y - b.y1); }
  return Math.min(Infinity, ...(d.vanTiles || []).map(([x, y]) => Math.abs(x - pos.x) + Math.abs(y - pos.y)));
}
function turret(rt, out) {
  const lv = Van.statOf(rt.van, "turret");
  if (!lv) return;
  const t = Mobs.mobs().filter((m) => vanDist(m.pos) <= TURRET_RANGE).sort((a, b) => vanDist(a.pos) - vanDist(b.pos))[0];
  if (!t) return;
  if (L.attack().skillDodge(VAN_SRC, t, "ป้อมปืน")) { out.shots.push({ id: t.id, x: t.pos.x, y: t.pos.y, dmg: 0, dodge: true }); return; }
  const before = t.hp + (t.armor || 0);
  L.combat().dealMixed(t, lv);
  out.shots.push({ id: t.id, x: t.pos.x, y: t.pos.y, dmg: before - (t.hp + (t.armor || 0)) });
  H().settle(t);
}
function dogAct(rt, out) {
  const dog = Object.values(match.players).find((p) => p.summon && p.summon.rtDog && p.alive && p.pos);
  if (!dog) return;
  const targets = Mobs.mobs();
  if (!targets.length) return;
  const adj = (x, y) => targets.find((m) => Math.abs(m.pos.x - x) + Math.abs(m.pos.y - y) === 1);
  let t = adj(dog.pos.x, dog.pos.y);
  if (!t) {
    const action = L.action();
    const stops = Board.reachable(action.boardMap(), { id: dog.id, x: dog.pos.x, y: dog.pos.y, size: 1 }, DOG.mov, action.boardUnits().filter((u) => u.id !== dog.id), { isAlly: (a, b) => !Mobs.isMob(match.players[b.id]), blocked: action.boardBlocked(dog.id) });
    let best = null, bd = Infinity;
    for (const n of stops.values()) { const dd = Math.min(...targets.map((m) => Math.abs(m.pos.x - n.x) + Math.abs(m.pos.y - n.y))); if (dd < bd) { bd = dd; best = n; } }
    if (best && (best.x !== dog.pos.x || best.y !== dog.pos.y)) { out.moves.push({ id: dog.id, from: { ...dog.pos }, to: { x: best.x, y: best.y }, path: Board.pathTo(stops, best.x, best.y) }); dog.pos = { x: best.x, y: best.y }; }
    t = adj(dog.pos.x, dog.pos.y);
  }
  if (!t) return;
  if (L.attack().skillDodge(dog, t, "กัด")) { out.misses.push({ id: dog.id, target: t.id }); return; }
  const before = t.hp + (t.armor || 0);
  // ต้นตอ = หมา ทั้งตอนลงดาเมจและตอนตัดสินตาย → เหรียญเข้าเจ้าของหมา (onMobDeath)
  L.combat().withEffectSource(dog, () => { L.combat().dealMixed(t, dog.summon.atk || DOG.atk); out.attacks.push({ id: dog.id, type: "dog", x: dog.pos.x, y: dog.pos.y, target: t.id, dmg: before - (t.hp + (t.armor || 0)) }); H().settle(t); });
}

// ---------- จบเทิร์น ----------
function onEndTurn() {
  const RT = H(), rt = match.roadtrip, c = rt.combat;
  enforceVan();
  if (c && c.round >= MAX_ROUNDS && c.kind !== "boss") { c.survived = true; RT.fx("mobsFlee", {}); }
  if (!c || c.kind !== "onvan") return;
  const d = Maps.defs[Maps.RT_ONVAN];
  const [dx, dy] = d.driverTile || [];
  const driver = Object.values(match.players).find((p) => p.alive && !p.summon && p.pos && p.pos.x === dx && p.pos.y === dy);
  if (!driver) { const n = RT.hurtVan(SWERVE_DMG, "swerve"); RT.fx("swerve", { dmg: n }); match.lastLog.push(`🚐 ไม่มีคนขับ — รถส่าย -${n}`); }
  if (c.round >= c.rounds) c.survived = true;
}
const MAX_ROUNDS = 15; // กันการต่อสู้ค้างไม่จบ (มอนไปหาใครไม่ได้/ผู้เล่นไม่เข้าไปหา) — ครบแล้วมอนที่เหลือถอยไป = ชนะ

// ---------- ตัดสิน (phases/endTurn.js gameOver) ----------
function outcome() {
  const RT = H(), rt = match.roadtrip;
  if (!rt) return false;
  if (rt.phase === "over") return true;
  if (rt.phase !== "combat" || !rt.combat) return false;
  match.forcedWinnerId = null; // PVE: ผู้ชนะที่ถูกกำหนด (ยูกิ) ไม่มีความหมาย
  if (rt.van.hp <= 0) return RT.lose("van");
  if (!Object.values(match.players).some((p) => p.alive && !p.summon)) return RT.lose("wipe");
  if (!Mobs.mobs().length || rt.combat.survived) { win(); return true; }
  return false;
}
function win() {
  const RT = H(), rt = match.roadtrip, c = rt.combat;
  RT.cancelCombatFlow();
  const bonus = REWARD.base + Math.floor(rt.km / REWARD.perKm) + (c.kind === "elite" ? REWARD.elite : 0) + (c.kind === "boss" ? REWARD.boss : 0);
  const got = RT.giveGoldAll(bonus);
  L.summon().removeAll();
  for (const p of Object.values(match.players)) p.result = p.alive ? null : p.result;
  if (diffOf(rt).autoRevive) for (const p of RT.crew()) if (!p.alive) RT.raise(p, 0.5);
  RT.fx("combatEnd", { kind: c.kind, win: true, gold: bonus });
  match.lastLog.push(`🏆 ชนะ! ทุกคน +${bonus} เหรียญ`);
  rt.combat = null;
  RT.toDrive();
  return got;
}
function onMobDeath(m, killerId) {
  const RT = H(), rt = match.roadtrip;
  if (!Mobs.isMob(m)) return;
  rt.kills++;
  const killer = killerId && match.players[killerId];
  // คนฆ่าเป็นยูนิตที่ถูกเรียก (ร่างแยก/หมาประจำปั๊ม) = เหรียญเข้าเจ้าของ · ระบบคู่ = เจ้าของฝ่าย
  const base = killer && killer.summon ? match.players[killer.summon.ownerId] : killer;
  const owner = base && !base.summon ? (base.duoOf ? match.players[base.duoOf] || base : base) : null;
  const gold = m.summon.gold | 0;
  let got = 0;
  if (owner && gold) { got = L.shop().addGold(owner, gold); rt.gold += got; }
  RT.fx("mobDie", { id: m.id, type: m.summon.mobType, x: m.pos ? m.pos.x : null, y: m.pos ? m.pos.y : null, by: owner ? owner.id : null, gold: got });
}
// ประตูท้าย (ตาตัวเอง · สู้บนรถตู้ และรถจอดตอนดักทาง)
function toggleRear(p) {
  const RT = H(), rt = match.roadtrip;
  p = match.players[require("../duo").controlledId(p.id)] || p; // ระบบคู่: ตัวที่คุมอยู่ตอนนี้
  const d = RT.mapDef();
  if (!RT.inCombat() || !rt.combat || !d || !d.rearTiles || !d.rearTiles.length || !L.action().canAct(p)) return false; // ทุกแบบการต่อสู้ที่แผนที่มีประตูท้าย (บนรถตู้ + ดักทาง/อีลิท/บอส)
  rt.van.rearOpen = !rt.van.rearOpen;
  RT.fx("rear", { open: rt.van.rearOpen, by: p.id });
  return true;
}

module.exports = { swerve, fireTurret, toggleRoof, roofSync, roofLurch, actionsOf, SWERVE, ROOF_FALL, offVan, vanSpot, placeSpot, dropOff, enforceVan, onvanNow, bossIndex, FALL_DMG, SWERVE_DMG, REWARD, begin, startRound, spawnWave, spawnDog, applyBuffs, preRound, scroll, turret, onEndTurn, outcome, win, onMobDeath, toggleRear, forwardOf };

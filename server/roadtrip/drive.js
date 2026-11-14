// Road Trip: ช่วงขับเรียลไทม์ (contract §2) — ตัวจับเวลาของโหมดเอง (setInterval 250 ms · unref · ล้างเมื่อออกจาก drive/จบเกม)
//  กม. เพิ่มตามความเร็ว · น้ำมันลด (หมด = 30 กม./ชม.) · สิ่งกีดขวางโผล่ล่วงหน้า 3 วิ ในเลน −1/0/1 → ถึงรถแล้วอยู่เลนเดียวกัน = รถเสีย HP
//  คนขับ (ใครนั่งก่อนได้ก่อน) เปลี่ยนเลน/ไนตรัส · ไม่มีคนขับ = รถวิ่งตรง · ครบช่วง (LEG_KM) ×2 = ทางแยก · ข้าม 50 กม. = บอส
//  ส่ง state ทั้งก้อนไม่เกิน 4 ครั้ง/วิ (เหตุการณ์) · ปกติ 2 ครั้ง/วิ (กม./น้ำมัน)
const match = require("../match");
const Route = require("./route");
const Van = require("./van");
const { diffOf } = require("./diff");

const H = () => require("./index");
const TICK_MS = 250;
const HZ_WARN_MS = 3000;
const HZ_GAP = [4500, 7500];
const FUEL_PER_KM = 0.6;
const EMPTY_KMH = 30;
const NITRO_MS = 5000, NITRO_MUL = 1.5;
const STEER_MS = 500;             // คูลดาวน์เปลี่ยนเลน ÷ ช่วงล่าง
const ONVAN_PCT = 25;             // จบช่วงแรกของทางแยก: มอนไล่ล่ารถ (สู้บนรถตู้)
const HZ_KINDS = { plains: ["cone", "rock", "car"], desert: ["rock", "tumble", "car"], forest: ["log", "rock", "car"], snow: ["ice", "rock", "car"], ghost: ["wreck", "grave", "car"] };
let tickId = null, lastAt = 0, lastSend = 0, urgent = false;

function startTick() {
  stopTick();
  lastAt = Date.now();
  const rt = match.roadtrip;
  if (rt && !rt.hzNextAt) rt.hzNextAt = lastAt + 2500;
  tickId = setInterval(() => { try { step(); } catch (err) { console.error("[roadtrip] drive tick:", err); stopTick(); } }, TICK_MS);
  if (tickId.unref) tickId.unref();
}
function stopTick() { if (tickId) clearInterval(tickId); tickId = null; }
const ticking = () => !!tickId;

function speedOf(rt) {
  if (!rt) return 0;
  if (rt.phase !== "drive" && rt.phase !== "intro") return rt.phase === "fork" || rt.phase === "event" ? 40 : 0;
  if (rt.van.fuel <= 0) return EMPTY_KMH;
  return Math.round(rt.van.kmh * (rt.nitroUntil > Date.now() ? NITRO_MUL : 1));
}
function driverOk(rt) {
  const d = rt.van.driverId && match.players[rt.van.driverId];
  if (rt.van.driverId && (!d || !d.alive || d.connected === false)) { rt.van.driverId = null; urgent = true; }
}

// หนึ่งจังหวะ (dt = มิลลิวินาที) — เทสต์เรียกตรงได้
function step(dt = null, now = Date.now()) {
  const RT = H(), rt = match.roadtrip;
  if (!RT.active() || !rt || rt.phase !== "drive" || match.gameState !== "ROADTRIP") { stopTick(); return; }
  if (dt == null) dt = Math.max(0, Math.min(1000, now - lastAt));
  lastAt = now;
  if (!RT.awake().length) { rt.hzNextAt = Math.max(rt.hzNextAt, now + 2500); return; } // ไม่มีใครต่ออยู่ = รถจอดรอ (ไม่วิ่ง/ไม่ชนเองจนจบเกม)
  // บอสบังคับทุก 50 กม. (เช็คทุกจังหวะ — ข้ามหลักระหว่างทางแยก/จุดพักก็ขึ้นทันทีที่กลับมาขับ)
  if (rt.km >= rt.nextBossKm) { bossNow(rt); return; }
  driverOk(rt);
  // ระยะ + น้ำมัน
  const kmh = speedOf(rt);
  const dist = kmh * Route.KM_PER_SEC * dt / 1000;
  rt.km += dist;
  if (rt.van.fuel > 0) {
    rt.van.fuel = Math.max(0, rt.van.fuel - dist * FUEL_PER_KM * diffOf(rt).fuel);
    if (rt.van.fuel <= 0) { RT.fx("fuelEmpty", {}); match.lastLog.push("⛽ น้ำมันหมด! รถตู้คลานต่อได้แค่ 30 กม./ชม."); urgent = true; }
  }
  const reg = rt.region.id, night = rt.night;
  RT.syncRoute(rt);
  if (reg !== rt.region.id || night !== rt.night) urgent = true;
  // สิ่งกีดขวาง: ถึงรถแล้ว → ตัดสิน
  for (const h of rt.hazards.filter((o) => o.at <= now)) resolveHazard(rt, h);
  rt.hazards = rt.hazards.filter((o) => o.at > now);
  if (rt.van.hp <= 0) { RT.lose("van"); return; }
  if (now >= rt.hzNextAt) spawnHazard(rt, now);
  // ครบช่วงขับ
  if (rt.km - rt.legKm >= Route.LEG_KM) {
    rt.legs++;
    rt.legKm = rt.km;
    if (rt.km >= rt.nextBossKm) { bossNow(rt); return; }
    if (rt.legs >= Route.LEGS_PER_FORK) { openFork(); return; }
    if (Math.random() * 100 < ONVAN_PCT) { require("./fight").begin("onvan"); return; }
  }
  send(now);
}
function bossNow(rt) {
  rt.bossKm = Math.floor(rt.km / Route.BOSS_KM) * Route.BOSS_KM; // หลักที่ข้าม → ชนิดบอส (fight.bossIndex)
  rt.nextBossKm = (Math.floor(rt.km / Route.BOSS_KM) + 1) * Route.BOSS_KM; // ข้ามหลายหลักรวดเดียว = บอสตัวเดียว
  rt.legs = 0;
  rt.legKm = rt.km;
  H().fx("bossAlert", { type: require("./mobs").bossOf(require("./fight").bossIndex(rt)) });
  require("./fight").begin("boss");
}
function send(now = Date.now()) {
  if (urgent ? now - lastSend >= TICK_MS : now - lastSend >= 500) { lastSend = now; urgent = false; H().broadcast(); }
}
function spawnHazard(rt, now) {
  const kinds = HZ_KINDS[rt.region.id] || HZ_KINDS.plains;
  const h = { id: ++rt.hzSeq, lane: Math.floor(Math.random() * 3) - 1, at: now + HZ_WARN_MS, kind: kinds[Math.floor(Math.random() * kinds.length)] };
  rt.hazards.push(h);
  rt.hzNextAt = now + HZ_GAP[0] + Math.random() * (HZ_GAP[1] - HZ_GAP[0]);
  urgent = true;
  return h;
}
function hazardDmg(rt) {
  return Math.max(1, diffOf(rt).hazard + Math.floor(rt.km / 150) - Van.statOf(rt.van, "bumper"));
}
function resolveHazard(rt, h) {
  const RT = H();
  urgent = true;
  if (rt.van.lane !== h.lane) { RT.fx("hazardMiss", { id: h.id, lane: h.lane, kind: h.kind }); return false; }
  const dmg = RT.hurtVan(hazardDmg(rt), "hazard");
  RT.fx("hazardHit", { id: h.id, lane: h.lane, kind: h.kind, dmg });
  match.lastLog.push(`💥 รถตู้ชน${h.kind === "car" ? "รถคันอื่น" : "สิ่งกีดขวาง"} -${dmg} HP`);
  return true;
}

// ---------- คำสั่ง ----------
function command(p, name, o) {
  const RT = H(), rt = match.roadtrip, van = rt.van;
  const driving = ["intro", "drive", "fork", "event"].includes(rt.phase);
  if (name === "seat") {
    if (!p.alive) return false;
    if (o.seat === "driver") {
      if (van.driverId === p.id) return false;
      const cur = van.driverId && match.players[van.driverId];
      if (cur && cur.alive && cur.connected !== false) return false; // ใครนั่งก่อนได้ก่อน
      van.driverId = p.id;
      RT.fx("seat", { id: p.id });
      return true;
    }
    if (van.driverId !== p.id) return false;
    van.driverId = null;
    RT.fx("seat", { id: null });
    return true;
  }
  if (name === "horn") {
    const now = Date.now();
    if (rt.hornAt && now - rt.hornAt < 600) return false;
    rt.hornAt = now;
    RT.fx("horn", { id: p.id, style: van.style });
    return true;
  }
  if (!driving || van.driverId !== p.id || !p.alive) return false;
  if (name === "steer") {
    const lane = Number(o.lane);
    if (![-1, 0, 1].includes(lane) || lane === van.lane) return false;
    const now = Date.now(), cd = STEER_MS / Van.statOf(van, "susp");
    if (now - rt.steerAt < cd || Math.abs(lane - van.lane) > 1) return false; // ทีละเลน
    rt.steerAt = now;
    van.lane = lane;
    return true;
  }
  if (name === "nitro") {
    const now = Date.now();
    if (rt.phase !== "drive" || van.nitro <= 0 || rt.nitroUntil > now || van.fuel <= 0) return false;
    van.nitro--;
    rt.nitroUntil = now + NITRO_MS;
    RT.fx("nitro", { until: rt.nitroUntil });
    return true;
  }
  return false;
}

// ---------- ทางแยก ----------
function openFork() {
  const RT = H(), rt = match.roadtrip;
  rt.legs = 0;
  const options = Route.forkOptions(rt);
  if (rt.reveal) { // ชิงช้าสวรรค์/หมอดู: เห็นของจริงในทางแยกถัดไป
    for (const o of options) o.peek = peekOf(rt, o.kind);
    rt.reveal = null;
  }
  rt.fork = { options, votes: {} };
  RT.setPhase("fork", RT.SECS.fork, resolveFork);
  RT.fx("fork", { n: options.length });
  RT.broadcast();
}
function peekOf(rt, kind) {
  if (kind === "fight" || kind === "elite") { const pool = require("./mobs").poolFor(rt); return { mobs: [...new Set(pool)].slice(0, 3) }; }
  if (kind === "event") { const ev = require("./events").pickEvent(rt); rt.peekEvent = ev; return { event: ev }; }
  if (kind === "gas") return { gas: 1 };
  return {};
}
function vote(p, i) {
  const RT = H(), rt = match.roadtrip;
  if (rt.phase !== "fork" || !rt.fork || !Number.isInteger(i) || i < 0 || i >= rt.fork.options.length) return false;
  rt.fork.votes[p.id] = i;
  if (RT.awake().every((o) => rt.fork.votes[o.id] != null)) resolveFork();
  return true;
}
// เสียงข้างมาก · เสมอ = ทางที่มีคนเลือกก่อนในลิสต์ (ซ้ายสุด) · ไม่มีใครโหวต = ทางแรก
function tally(options, votes) {
  const n = options.map(() => 0);
  for (const v of Object.values(votes)) if (n[v] != null) n[v]++;
  const top = Math.max(...n);
  return Math.max(0, n.indexOf(top));
}
function resolveFork() {
  const RT = H(), rt = match.roadtrip;
  if (!rt || rt.phase !== "fork" || !rt.fork) return;
  const i = tally(rt.fork.options, rt.fork.votes);
  const { kind, km = 0 } = rt.fork.options[i];
  // วิ่งไปถึงจุดหมาย: ระยะ + น้ำมันตามทางที่เลือก (บอสยังนับที่หลัก 50 กม. ถัดไป)
  rt.km += km;
  rt.van.fuel = Math.max(0, rt.van.fuel - km * FUEL_PER_KM * diffOf(rt).fuel);
  RT.syncRoute(rt);
  RT.fx("forkPick", { i, kind, km });
  rt.fork = null;
  goNode(kind);
}
function goNode(kind) {
  if (kind === "gas" || kind === "motel") return require("./stop").enter(kind);
  if (kind === "event") return require("./events").open();
  if (kind === "elite") return require("./fight").begin("elite");
  return require("./fight").begin(Math.random() < 0.5 ? "ambush" : "onvan");
}

module.exports = { TICK_MS, HZ_WARN_MS, FUEL_PER_KM, EMPTY_KMH, NITRO_MS, STEER_MS, startTick, stopTick, ticking, step, speedOf, spawnHazard, resolveHazard, hazardDmg, command, openFork, vote, tally, resolveFork, goNode };

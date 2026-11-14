// Road Trip: เดินเล่นในรถตู้ระหว่างขับ (ผู้ใช้สั่ง 2026-11-14 "ระหว่างขับรถ เพื่อนๆจะเดินเล่นภายในรถได้")
//  ช่วงขับ (intro/drive/fork/event) ทุกตัวของผู้เล่นมีตำแหน่งในรถ rt.vanPos[id] = { x, y, roof } — ตารางเดียวกับ area 71 (vanTiles 3×7)
//   หรือดาดฟ้า (roofTiles 3×6 · ขึ้น/ลงทางช่องซันรูฟ hatchTile เท่านั้น) · เรียลไทม์ ไม่มีตาเดิน · ช่องละคนเดียว
//  rt:vanWalk {x, y, roof} → เดินตามทาง (ผ่านเพื่อนได้ หยุดซ้อนไม่ได้) · fx vanWalk { id, path: [[x, y, roof]…], roof } · เดินเสร็จก่อนจึงเดินใหม่ได้ (ก้าวละ 120 ms)
//  คนขับ = ยืนบน driverTile: เดินเข้าช่องว่าง = ได้ที่นั่ง · เดินออก = ปล่อย · rt:seat (นั่ง/ขอ/ยกให้ = สลับที่) ยังใช้ได้ → syncDriver จัดตำแหน่งตาม
//  ของในรถ rt:vanProp {prop} (ต้องยืนบน/ติดช่องของของชิ้นนั้น ชั้นเดียวกัน) → สถานะร่วมทุกเครื่อง rt.vanProps + fx vanProp
//  เข้าสู้บนรถตู้ = วางตามตำแหน่งในรถ (บนดาดฟ้า = ท่าบนหลังคาของการต่อสู้) · จบสู้ = เก็บตำแหน่งกลับ
const match = require("../match");
const Board = require("../board");
const Maps = require("./maps");

const H = () => require("./index");
const STEP_MS = 120;
const K3 = (x, y, roof) => `${roof ? 1 : 0}:${x},${y}`;
const def = () => Maps.defs[Maps.RT_ONVAN] || {};
const tileKeys = (list, roof) => new Set((list || []).map(([x, y]) => K3(x, y, roof)));
const DRIVE_PHASES = new Set(["intro", "drive", "fork", "event"]);
// ของในรถ: ชนิดการกด (toggle เปิด/ปิด · switch เปิด/ปิด · tap นับครั้ง · dice ทอยเต๋า) + ใครกดได้
const PROP_KIND = {
  glove: "toggle", hatch: "toggle", tool: "toggle", fridge: "toggle", cooler: "toggle", rear: "toggle", umbrella: "toggle",
  curtain0: "toggle", curtain1: "toggle", curtain2: "toggle", curtain3: "toggle", curtain4: "toggle", curtain5: "toggle",
  fan: "switch", light: "switch", grill: "switch",
  bob: "tap", pillow0: "tap", pillow1: "tap", guitar: "tap", micro: "tap", lounge: "tap", turret: "tap", table: "dice",
};
// แตร/พวงมาลัย/วิทยุ/กล้องส่อง = คำสั่งเดิม (rt:horn · rt:seat · วิทยุ) ไม่ใช่ของร่วม
const DRIVER_ONLY = new Set();
const initState = (kind) => (kind === "toggle" ? "closed" : kind === "switch" ? "off" : kind === "dice" ? { a: 1, b: 1, n: 0 } : 0);

function grids() {
  const d = def();
  return { inside: tileKeys(d.vanTiles, false), roof: tileKeys(d.roofTiles, true), hatch: d.hatchTile, driver: d.driverTile };
}
function crew() { return Object.values(match.players).filter((p) => !p.summon); }
// ตำแหน่งในรถของทุกตัว (คนใหม่/ตัวที่สองของระบบคู่ = หาที่นั่งว่าง · ช่องคนขับเว้นไว้) · ลบตัวที่ไม่อยู่แล้ว
const SEATS = [[13, 4], [11, 4], [11, 6], [9, 4], [9, 6], [12, 5], [10, 6], [8, 5], [12, 4], [10, 4], [12, 6], [8, 6], [8, 4], [9, 5], [10, 5], [7, 4], [7, 5], [7, 6], [11, 5]];
function ensure(rt) {
  if (!rt) return null;
  const vp = rt.vanPos || (rt.vanPos = {});
  for (const id of Object.keys(vp)) if (!match.players[id] || match.players[id].summon) delete vp[id];
  const { inside } = grids();
  for (const p of crew()) {
    if (vp[p.id]) continue;
    const s = SEATS.find(([x, y]) => inside.has(K3(x, y, false)) && !occupant(rt, x, y, false));
    if (s) vp[p.id] = { x: s[0], y: s[1], roof: false };
  }
  if (!rt.vanProps) rt.vanProps = Object.fromEntries(Object.entries(def().vanProps || {}).map(([k, v]) => [k, { x: v[0], y: v[1], roof: !!v[2], state: initState(PROP_KIND[k]) }]));
  return vp;
}
function occupant(rt, x, y, roof, exceptId = null) {
  for (const [id, q] of Object.entries(rt.vanPos || {})) if (id !== exceptId && q.x === x && q.y === y && !!q.roof === !!roof) return id;
  return null;
}
// เพื่อนบ้านในกราฟ (ในรถ/ดาดฟ้า + ช่องซันรูฟเชื่อมสองชั้น)
function neighbors(n, g) {
  const out = [];
  for (const [dx, dy] of Board.DIRS) {
    const k = K3(n.x + dx, n.y + dy, n.roof);
    if ((n.roof ? g.roof : g.inside).has(k)) out.push({ x: n.x + dx, y: n.y + dy, roof: n.roof });
  }
  if (g.hatch && n.x === g.hatch[0] && n.y === g.hatch[1]) out.push({ x: n.x, y: n.y, roof: !n.roof });
  return out;
}
function pathTo(rt, from, to) {
  const g = grids();
  const goal = K3(to.x, to.y, to.roof);
  if (!(to.roof ? g.roof : g.inside).has(goal)) return null;
  const start = { ...from, prev: null }, seen = new Set([K3(from.x, from.y, from.roof)]), q = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (K3(c.x, c.y, c.roof) === goal) { const path = []; for (let n = c; n; n = n.prev) path.unshift({ x: n.x, y: n.y, roof: !!n.roof }); return path; }
    for (const n of neighbors(c, g)) { const k = K3(n.x, n.y, n.roof); if (!seen.has(k)) { seen.add(k); q.push({ ...n, prev: c }); } } // ผ่านเพื่อนได้
  }
  return null;
}
const isDriverTile = (q) => { const d = def().driverTile; return !!d && !q.roof && q.x === d[0] && q.y === d[1]; };

function walk(p, o) {
  const RT = H(), rt = match.roadtrip;
  if (!rt || !DRIVE_PHASES.has(rt.phase) || !p.alive) return false;
  const vp = ensure(rt);
  if (o.unitId != null) { const u = require("../duo").unitsOf(p).find((x) => x.id === o.unitId); if (!u || !u.alive) return false; p = u; }
  const from = vp[p.id];
  const x = Number(o.x), y = Number(o.y), roof = !!o.roof;
  if (!from || !Number.isInteger(x) || !Number.isInteger(y)) return false;
  const now = Date.now();
  rt.vanBusy = rt.vanBusy || {};
  if ((rt.vanBusy[p.id] || 0) > now) return false; // ยังเดินอยู่
  if (from.x === x && from.y === y && !!from.roof === roof) return false;
  if (occupant(rt, x, y, roof, p.id)) return false; // ปลายทางมีคน (ช่องคนขับที่มีคนนั่ง = client เสนอ "ขอขับ")
  const path = pathTo(rt, from, { x, y, roof });
  if (!path || path.length < 2) return false;
  const wasDriver = rt.van.driverId === p.id;
  vp[p.id] = { x, y, roof };
  rt.vanBusy[p.id] = now + (path.length - 1) * STEP_MS;
  RT.fx("vanWalk", { id: p.id, path: path.map((t) => [t.x, t.y, t.roof]), roof });
  // ที่นั่งคนขับตามช่องที่ยืน
  if (isDriverTile(vp[p.id]) && !rt.van.driverId) { rt.van.driverId = p.id; rt.van.seatReq = null; rt.driverActAt = now; RT.fx("seat", { id: p.id }); }
  else if (wasDriver && !isDriverTile(vp[p.id])) { rt.van.driverId = null; rt.van.seatReq = null; RT.fx("seat", { id: null }); }
  return true;
}
// คนขับเปลี่ยนจากทางอื่น (rt:seat นั่ง/ยกให้/ลุก · ไม่ขยับนาน · หลุด/ตาย) → จัดตำแหน่งให้ตรง: คนขับยืนช่องคนขับ · ยกให้ = สลับที่กัน · ลุก = ขยับไปช่องว่างใกล้สุด
function syncDriver(rt = match.roadtrip) {
  if (!rt || !rt.van) return;
  const vp = ensure(rt), d = def().driverTile;
  if (!d) return;
  const occ = occupant(rt, d[0], d[1], false), drv = rt.van.driverId;
  if (drv && occ === drv) return;
  if (drv && vp[drv]) {
    const mine = { ...vp[drv] };
    if (occ) vp[occ] = mine; // สลับที่ (ยกให้)
    vp[drv] = { x: d[0], y: d[1], roof: false };
    H().fx("vanWalk", { id: drv, path: [[mine.x, mine.y, mine.roof], [d[0], d[1], false]], roof: false, seat: true });
    return;
  }
  if (!drv && occ) { // ลุก/ถูกปล่อย = ขยับออกจากช่องคนขับ
    const g = grids();
    const free = [...g.inside].map((k) => k.slice(2).split(",").map(Number)).filter(([x, y]) => !(x === d[0] && y === d[1]) && !occupant(rt, x, y, false))
      .sort((a, b) => (Math.abs(a[0] - d[0]) + Math.abs(a[1] - d[1])) - (Math.abs(b[0] - d[0]) + Math.abs(b[1] - d[1])))[0];
    if (free) { vp[occ] = { x: free[0], y: free[1], roof: false }; H().fx("vanWalk", { id: occ, path: [[d[0], d[1], false], [free[0], free[1], false]], roof: false }); }
  }
}
// ของในรถ
function useProp(p, key) {
  const RT = H(), rt = match.roadtrip;
  if (!rt || !DRIVE_PHASES.has(rt.phase) || !p.alive) return false;
  ensure(rt);
  const pr = rt.vanProps && rt.vanProps[key], kind = PROP_KIND[key];
  const me = rt.vanPos[p.id];
  if (!pr || !kind || !me || !!me.roof !== !!pr.roof) return false;
  if (Math.abs(me.x - pr.x) + Math.abs(me.y - pr.y) > 1) return false; // ต้องยืนบน/ติด
  if (DRIVER_ONLY.has(key) && rt.van.driverId !== p.id) return false;
  if (kind === "toggle") pr.state = pr.state === "open" ? "closed" : "open";
  else if (kind === "switch") pr.state = pr.state === "on" ? "off" : "on";
  else if (kind === "dice") pr.state = { a: 1 + Math.floor(Math.random() * 6), b: 1 + Math.floor(Math.random() * 6), n: ((pr.state && pr.state.n) | 0) + 1 };
  else pr.state = (pr.state | 0) + 1;
  RT.fx("vanProp", { id: p.id, prop: key, state: pr.state });
  return true;
}
// เข้าสู้บนรถตู้: วางตามตำแหน่งในรถ (ดาดฟ้า = ท่าบนหลังคา ทีละคน ที่ช่องซันรูฟ)
function placeForFight(rt) {
  const vp = ensure(rt), d = def(), action = require("../phases/action");
  const units = crew().filter((p) => p.alive && p.pos);
  for (const p of units) p.pos = null; // จัดใหม่ทั้งหมด
  let roofDone = false;
  const order = [...units].sort((a, b) => ((vp[a.id] && vp[a.id].roof) ? 1 : 0) - ((vp[b.id] && vp[b.id].roof) ? 1 : 0));
  for (const p of order) {
    const q = vp[p.id];
    let spot = null;
    if (q && q.roof && !roofDone && d.hatchTile && action.tileFree(d.hatchTile[0], d.hatchTile[1], p.id)) {
      spot = { x: d.hatchTile[0], y: d.hatchTile[1] };
      p.rtRoof = true; rt.combat.roofId = p.id; roofDone = true;
    } else if (q && !q.roof && action.tileFree(q.x, q.y, p.id)) spot = { x: q.x, y: q.y };
    if (!spot) spot = require("./fight").vanSpot(q || null, p.id);
    p.pos = spot;
  }
}
// จบสู้บนรถตู้ → ตำแหน่งในรถจากตำแหน่งบนกระดาน (ยังอยู่ในรถเท่านั้น)
function captureFromFight(rt) {
  const vp = ensure(rt), g = grids();
  const used = new Set(), moved = new Set();
  for (const p of crew()) {
    if (!p.pos) continue;
    const roof = !!p.rtRoof;
    const k = K3(p.pos.x, p.pos.y, roof);
    if (!(roof ? g.roof : g.inside).has(k) || used.has(k)) continue;
    used.add(k); moved.add(p.id);
    vp[p.id] = { x: p.pos.x, y: p.pos.y, roof };
  }
  // คนที่ไม่ได้อยู่ในรถตอนจบ (ล้ม ฯลฯ) แต่ตำแหน่งเดิมทับคนอื่น = หาที่ใหม่ (ensure)
  for (const [id, q] of Object.entries(vp)) { if (moved.has(id)) continue; const k = K3(q.x, q.y, q.roof); if (!used.has(k)) used.add(k); else delete vp[id]; }
  ensure(rt);
}
function publicInfo(rt) {
  if (!rt || !rt.vanPos) return { vanPos: {}, vanProps: {} };
  return { vanPos: Object.fromEntries(Object.entries(rt.vanPos).map(([id, q]) => [id, { ...q }])), vanProps: Object.fromEntries(Object.entries(rt.vanProps || {}).map(([k, v]) => [k, { ...v, state: v.state && typeof v.state === "object" ? { ...v.state } : v.state }])) };
}
module.exports = { STEP_MS, PROP_KIND, DRIVER_ONLY, ensure, walk, syncDriver, useProp, placeForFight, captureFromFight, publicInfo, pathTo, occupant };

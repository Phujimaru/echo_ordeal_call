// Road Trip: กิจกรรมกับเพื่อนในรถตู้ระหว่างขับ (ผู้ใช้สั่ง 2026-11-14 "เล่นได้จริง = กิจกรรมที่ทำกับเพื่อน ไม่ใช่กดแล้วจบ")
//  ทั้งหมดตัดสินที่ server · ใช้ได้เฉพาะช่วงเดินทาง (intro/drive/fork/event) · เข้าสู้/จุดพัก/จบเกม = ยกเลิกทุกวง (คืนเงินกองกลาง)
//  คำสั่งเดียว rt:fun { a, ... } (index.command "fun") · สถานะ rt.fun → state.roadtrip.fun (publicInfo — กล่องของถูกกรองตามผู้ดู)
//  ตำแหน่ง = rt.vanPos (vanwalk.js) — ยังไม่ถึงของ = server เดินไปช่องว่างใกล้สุดก่อน แล้วค่อยทำตอนถึง (แบบ useProp)
//   1) วงเต๋า (โต๊ะ 10,5)        a: "dice" {ante} เปิดวง · "diceJoin" เข้าร่วม — หมดเวลารวมวง ทอย 2 ลูกทุกคน แต้มสูงสุดกินกอง (เสมอ = แบ่ง) · คนเดียว = เล่นกับเจ้ามือ
//   2) วงดนตรี (กีตาร์ 7,5)      a: "jam" เริ่ม · "jamJoin" เข้าร่วม (ทุกคนในรถ ยกเว้นคนขับ) · "jamHit" {i, off} กดโน้ต — จบเพลง = บัฟทีมสู้ครั้งหน้าตามคะแนน
//   3) ปิ้งย่างบนหลังคา (เตา 10,4 ดาดฟ้า) a: "grill" เริ่ม (คนย่าง) · "grillJoin" ขึ้นมาร่วม · "grillFlip" พลิก/เสิร์ฟ (คนย่าง — กดตอนสุกพอดี) · "grillTake" รับ 1 ที่
//   4) ผู้ส่องทาง (กล้องส่องทางไกล 12,4 ดาดฟ้า) a: "spot" ส่อง/เลิกส่อง · "mark" {id} ปักหมุดกล่องของ — คนขับเข้าเลนนั้นทันก่อนถึง = ได้ของทั้งทีม
//   5) ตู้เย็น (8,6) a: "drink" (ของมีจำกัด เติมที่ปั๊ม) · กล่องเครื่องมือ (9,6) a: "repair" ซ่อมรถ (ยืนค้าง · สองคนเร็วขึ้นเท่าตัว)
const match = require("../match");

const H = () => require("./index");
const VW = () => require("./vanwalk");
const L = { combat: () => require("../combat"), shop: () => require("../shop") };

// ---------------------------------------------------------------- ค่าทั้งหมด (Claude ตั้ง — รายงานผู้ใช้แล้ว GRID_PLAN §8.8)
const FUN = {
  dice: { antes: [1, 2, 3], joinMs: 8000, max: 6, showMs: 5000, reach: 2 },
  jam: { leadMs: 3000, lenMs: 20000, bpm: 100, lanes: 3, joinCutMs: 3000, goodMs: 150, perfectMs: 60, perfectPts: 1, goodPts: 0.6, showMs: 5000,
    perExtra: 0.2, // คะแนนทีม = ความแม่นเฉลี่ย × (1 + 0.2 × (คนที่เพิ่ม))
    tiers: [ // คะแนนขั้นต่ำ → บัฟทีม "สู้ครั้งหน้า"
      { min: 0.35, buffs: [{ key: "evade", amt: 15, turns: 1, name: "ฮึกเหิม" }] },
      { min: 0.6, buffs: [{ key: "evade", amt: 15, turns: 1, name: "ฮึกเหิม" }, { key: "might", amt: 1, turns: 1, name: "ฮึกเหิม" }] },
      { min: 0.9, buffs: [{ key: "evade", amt: 20, turns: 2, name: "ฮึกเหิม" }, { key: "might", amt: 1, turns: 2, name: "ฮึกเหิม" }] },
    ] },
  grill: { perLeg: 2, stages: [5000, 4000], win: [0.6, 0.85], perfect: 0.05, graceMs: 150, max: 6, keepMs: 45000, showMs: 4000, heal: 2, armor: 1, takeReach: 2 },
  spot: { leadMs: 9000, gap: [14000, 22000], firstMs: 4000, seeMs: 2500, max: 2, coin: 2, itemPct: 25, itemCoin: 1, items: ["armor", "cleanse", "rtFish"] },
  fridge: { stock: 3, heal: 1, closeMs: 1400 },
  repair: { needMs: 5000, hp: 1, cdMs: 20000 },
};
const TILE = { table: [10, 5, 0], guitar: [7, 5, 0], grill: [10, 4, 1], binoc: [12, 4, 1], fridge: [8, 6, 0], tool: [9, 6, 0] };
const DRIVE_PHASES = new Set(["intro", "drive", "fork", "event"]);
const TICK_MS = 200;
const at = (k) => ({ x: TILE[k][0], y: TILE[k][1], roof: !!TILE[k][2] });
const dist = (a, b) => (a && b && !!a.roof === !!b.roof ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : Infinity);

let tickId = null;

function fresh() {
  return { leg: 0, dice: null, jam: null, jamLeg: -1, grill: null, grillLeg: { leg: -1, n: 0 }, spot: {}, loot: [], lootSeq: 0, lootNextAt: 0, fridge: FUN.fridge.stock, fridgeCloseAt: 0, repair: null, repairCd: {}, dirty: false };
}
function ensure(rt) { if (!rt.fun) rt.fun = fresh(); return rt.fun; }

// ---------------------------------------------------------------- ตัวช่วย
const isDriver = (rt, p) => !!rt.van && rt.van.driverId === p.id;
function canAct(rt, p) { return !!rt && DRIVE_PHASES.has(rt.phase) && !!p && p.alive && !p.summon; }
// ช่องว่างที่ห่างจาก target ≤ R (ชั้นเดียวกัน · ไม่ใช่ช่องคนขับ) ที่เดินถึงเร็วสุด
function spotNear(rt, from, target, R) {
  const vw = VW(), Maps = require("./maps"), d = Maps.defs[Maps.RT_ONVAN] || {};
  const layer = new Set((target.roof ? d.roofTiles : d.vanTiles || []).map(([x, y]) => `${x},${y}`));
  const drv = d.driverTile;
  const me = vw.occupant(rt, from.x, from.y, from.roof);
  let best = null;
  for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
    if (Math.abs(dx) + Math.abs(dy) > R) continue;
    const t = { x: target.x + dx, y: target.y + dy, roof: !!target.roof };
    if (!layer.has(`${t.x},${t.y}`)) continue;
    if (!t.roof && drv && t.x === drv[0] && t.y === drv[1]) continue;
    if (vw.occupant(rt, t.x, t.y, t.roof, me)) continue;
    const path = vw.pathTo(rt, from, t);
    if (!path) continue;
    const score = path.length * 10 + Math.abs(dx) + Math.abs(dy);
    if (!best || score < best.score) best = { t, score };
  }
  return best ? best.t : null;
}
// ยืนห่างของ ≤ R แล้ว = ทำทันที · ยังไม่ถึง = เดินไปก่อนแล้วทำตอนถึง (ใช้คิวเดียวกับของในรถ rt.vanPend — คำสั่งใหม่ยกเลิกอันเก่า)
function goThen(rt, p, key, R, fn) {
  const vw = VW();
  vw.ensure(rt);
  const me = rt.vanPos[p.id], target = at(key);
  if (!me) return false;
  if (dist(me, target) <= R) return fn() !== false;
  const t = spotNear(rt, me, target, R);
  if (!t) return false;
  const path = vw.moveTo(rt, p, t);
  if (!path) return false;
  const pend = rt.vanPend || (rt.vanPend = {});
  if (pend[p.id]) clearTimeout(pend[p.id]);
  const t0 = setTimeout(() => {
    if (rt.vanPend && rt.vanPend[p.id] === t0) delete rt.vanPend[p.id];
    if (match.roadtrip !== rt || !canAct(rt, p) || dist(rt.vanPos[p.id], target) > R) return;
    if (fn() !== false) { startTick(); H().broadcast(); } // ตัวจับเวลาอาจหยุดไประหว่างเดิน (ตอนนั้นยังไม่มีกิจกรรม)
  }, (path.length - 1) * vw.STEP_MS);
  if (t0.unref) t0.unref();
  pend[p.id] = t0;
  return true;
}
const fx = (k, data) => H().fx("fun", { f: k, ...data });
function setProp(rt, key, state) {
  const pr = rt.vanProps && rt.vanProps[key];
  if (!pr) return;
  pr.state = state;
  H().fx("vanProp", { id: null, prop: key, state });
}
function refund(p, n) { return n > 0 && p ? L.shop().addGold(p, n) : 0; }
// สุ่มแบบมีเมล็ด (โน้ตเพลง — ทุกเครื่องได้ชุดเดียวกันจาก server)
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function chartOf(seed) {
  const r = rng(seed), J = FUN.jam, beat = 60000 / J.bpm, out = [];
  let last = -1;
  for (let b = 2; b * beat < J.lenMs - beat; b++) {
    if (r() < 0.6) { let lane = Math.floor(r() * J.lanes); if (lane === last && r() < 0.5) lane = (lane + 1) % J.lanes; out.push([Math.round(b * beat), lane]); last = lane; }
    if (r() < 0.18 && (b + 0.5) * beat < J.lenMs - beat) out.push([Math.round((b + 0.5) * beat), Math.floor(r() * J.lanes)]);
  }
  return out;
}

// ---------------------------------------------------------------- คำสั่ง
function command(p, o) {
  const rt = match.roadtrip;
  if (!canAct(rt, p)) return false;
  const f = ensure(rt), a = typeof o.a === "string" ? o.a : "";
  let ok = false;
  switch (a) {
    case "dice": ok = diceOpen(rt, f, p, Number(o.ante)); break;
    case "diceJoin": ok = diceJoin(rt, f, p); break;
    case "jam": ok = jamStart(rt, f, p); break;
    case "jamJoin": ok = jamJoin(rt, f, p); break;
    case "jamHit": jamHit(rt, f, p, o); return false; // คะแนนรวมส่งตามรอบ tick (ไม่ broadcast ทุกโน้ต)
    case "grill": ok = grillStart(rt, f, p); break;
    case "grillJoin": ok = grillJoin(rt, f, p); break;
    case "grillFlip": ok = grillFlip(rt, f, p); break;
    case "grillTake": ok = grillTake(rt, f, p); break;
    case "spot": ok = spotToggle(rt, f, p); break;
    case "mark": ok = mark(rt, f, p, Number(o.id)); break;
    case "drink": ok = drink(rt, f, p); break;
    case "repair": ok = repair(rt, f, p); break;
    default: return false;
  }
  if (ok) startTick();
  return ok;
}

// ---- 1) วงเต๋า
function diceOpen(rt, f, p, ante) {
  if (f.dice || isDriver(rt, p) || !FUN.dice.antes.includes(ante) || (p.gold || 0) < ante) return false;
  return goThen(rt, p, "table", 1, () => {
    if (f.dice || (p.gold || 0) < ante || isDriver(rt, p)) return false;
    p.gold -= ante;
    f.dice = { by: p.id, ante, pot: ante, ids: [p.id], at: Date.now() + FUN.dice.joinMs, result: null };
    fx("diceOpen", { id: p.id, ante, sfx: "coin" });
    match.lastLog.push(`🎲 ${p.name} เปิดวงเต๋า (${ante} เหรียญ)`);
    return true;
  });
}
function diceJoin(rt, f, p) {
  const d = f.dice;
  if (!d || d.result || d.ids.includes(p.id) || d.ids.length >= FUN.dice.max || isDriver(rt, p) || (p.gold || 0) < d.ante) return false;
  return goThen(rt, p, "table", FUN.dice.reach, () => {
    if (f.dice !== d || d.result || d.ids.includes(p.id) || d.ids.length >= FUN.dice.max || (p.gold || 0) < d.ante) return false;
    p.gold -= d.ante; d.pot += d.ante; d.ids.push(p.id);
    fx("diceJoin", { id: p.id, sfx: "coin" });
    return true;
  });
}
const roll2 = () => [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
function diceRoll(rt, f, now) {
  const d = f.dice, rolls = {}, gain = {};
  const ids = d.ids.filter((id) => match.players[id]);
  for (const id of ids) rolls[id] = roll2();
  const sum = (r) => r[0] + r[1];
  let house = null, win = [];
  if (ids.length === 1) { // คนเดียว = เจ้ามือ: ชนะ = ได้คืน 2 เท่า · เสมอ = คืนเงิน · แพ้ = เสียเดิมพัน
    house = roll2();
    const me = ids[0], a = sum(rolls[me]), b = sum(house);
    const back = a > b ? d.pot * 2 : a === b ? d.pot : 0;
    gain[me] = refund(match.players[me], back) - d.ante;
    if (a >= b) win = [me];
  } else if (ids.length) {
    const top = Math.max(...ids.map((id) => sum(rolls[id])));
    win = ids.filter((id) => sum(rolls[id]) === top);
    const each = Math.floor(d.pot / win.length);
    let rest = d.pot - each * win.length; // เศษ = คนที่เข้าวงก่อนได้คนละ 1
    for (const id of ids) gain[id] = -d.ante;
    for (const id of win) { const n = each + (rest > 0 ? 1 : 0); if (rest > 0) rest--; gain[id] += refund(match.players[id], n); }
  }
  d.result = { rolls, house, win, gain, until: now + FUN.dice.showMs };
  const first = rolls[d.by] || rolls[ids[0]];
  if (first) setProp(rt, "table", { a: first[0], b: first[1], n: (((rt.vanProps.table || {}).state || {}).n | 0) + 1 });
  fx("diceRoll", { win, house, sfx: win.length ? "cash" : null });
  match.lastLog.push(`🎲 วงเต๋า — ${win.length ? win.map((id) => (match.players[id] || {}).name).join(", ") + " ชนะ" : "เจ้ามือชนะ"} (กอง ${d.pot})`);
}

// ---- 2) วงดนตรี
function jamStart(rt, f, p) {
  if (f.jam || f.jamLeg === f.leg || isDriver(rt, p)) return false;
  return goThen(rt, p, "guitar", 1, () => {
    if (f.jam || f.jamLeg === f.leg || isDriver(rt, p)) return false;
    const now = Date.now(), seed = (Math.random() * 2 ** 31) | 0;
    const startAt = now + FUN.jam.leadMs;
    f.jam = { by: p.id, seed, startAt, endAt: startAt + FUN.jam.lenMs, bpm: FUN.jam.bpm, chart: chartOf(seed), ids: { [p.id]: { pts: 0, hit: {} } }, result: null };
    f.jamLeg = f.leg;
    setProp(rt, "guitar", ((rt.vanProps.guitar || {}).state | 0) + 1);
    fx("jamStart", { id: p.id, sfx: "event_sting" });
    match.lastLog.push(`🎸 ${p.name} เริ่มเล่นดนตรี!`);
    return true;
  });
}
function jamJoin(rt, f, p) {
  const j = f.jam;
  if (!j || j.result || j.ids[p.id] || isDriver(rt, p) || Date.now() > j.endAt - FUN.jam.joinCutMs) return false;
  j.ids[p.id] = { pts: 0, hit: {} };
  fx("jamJoin", { id: p.id });
  return true;
}
// client วัดระยะห่างจากจังหวะเอง (off มิลลิวินาที) · server ตรวจว่าโน้ตนั้นอยู่ในช่วงเวลาจริง (เผื่อหน่วงเครือข่าย) และกดได้ครั้งเดียว
function jamHit(rt, f, p, o) {
  const j = f.jam, me = j && j.ids[p.id];
  if (!me || j.result) return false;
  const i = Number(o.i), off = Math.abs(Number(o.off));
  if (!Number.isInteger(i) || i < 0 || i >= j.chart.length || me.hit[i] || !Number.isFinite(off) || off > FUN.jam.goodMs) return false;
  const now = Date.now(), t = j.startAt + j.chart[i][0];
  if (now < t - 1000 || now > t + 1500) return false;
  me.hit[i] = 1;
  me.pts += off <= FUN.jam.perfectMs ? FUN.jam.perfectPts : FUN.jam.goodPts;
  f.dirty = true;
  return true;
}
function jamScore(j) {
  const ids = Object.keys(j.ids), n = ids.length, notes = Math.max(1, j.chart.length);
  const acc = n ? ids.reduce((s, id) => s + Math.min(1, j.ids[id].pts / notes), 0) / n : 0;
  return { n, acc, score: acc * (1 + FUN.jam.perExtra * Math.max(0, n - 1)) };
}
function jamEnd(rt, f, now) {
  const j = f.jam, { n, acc, score } = jamScore(j);
  let tier = 0;
  FUN.jam.tiers.forEach((t, i) => { if (score >= t.min) tier = i + 1; });
  const buffs = tier ? FUN.jam.tiers[tier - 1].buffs : [];
  for (const b of buffs) (rt.buffs.team || (rt.buffs.team = [])).push({ ...b, debuff: false });
  j.result = { tier, acc: Math.round(acc * 100), score: Math.round(score * 100), n, buffs: buffs.map((b) => ({ key: b.key, amt: b.amt, turns: b.turns, name: b.name })), until: now + FUN.jam.showMs };
  fx("jamEnd", { tier, sfx: tier ? "crowd_cheer" : null });
  match.lastLog.push(`🎸 จบเพลง — ${tier ? `ทีมฮึกเหิม (ขั้น ${tier})` : "ยังไม่เข้าขา"} (${Math.round(acc * 100)}%)`);
}

// ---- 3) ปิ้งย่างบนหลังคา
function grillUses(f) { return f.grillLeg.leg === f.leg ? f.grillLeg.n : 0; }
function grillStart(rt, f, p) {
  if (f.grill || grillUses(f) >= FUN.grill.perLeg || isDriver(rt, p)) return false;
  return goThen(rt, p, "grill", 1, () => {
    if (f.grill || grillUses(f) >= FUN.grill.perLeg || isDriver(rt, p)) return false;
    f.grill = { by: p.id, ids: [p.id], stage: 0, t0: Date.now(), len: FUN.grill.stages[0], bonus: 0, state: "cook", portions: 0, took: {}, until: 0, marks: [] };
    f.grillLeg = { leg: f.leg, n: grillUses(f) + 1 };
    setProp(rt, "grill", "on");
    fx("grillStart", { id: p.id, sfx: "sizzle" });
    return true;
  });
}
function grillJoin(rt, f, p) {
  const g = f.grill;
  if (!g || g.state !== "cook" || g.ids.includes(p.id) || g.ids.length >= FUN.grill.max || isDriver(rt, p)) return false;
  return goThen(rt, p, "grill", FUN.grill.takeReach, () => {
    if (f.grill !== g || g.state !== "cook" || g.ids.includes(p.id) || g.ids.length >= FUN.grill.max) return false;
    g.ids.push(p.id);
    fx("grillJoin", { id: p.id });
    return true;
  });
}
// พลิก (ด้านแรก) / เสิร์ฟ (ด้านที่สอง): กดในช่วงสุกพอดี = ดี · กลางช่วงพอดีเป๊ะ = +1 ที่ · กดเร็วไป (ยังดิบ) = −1 ที่ · ปล่อยเลยเวลา = ไหม้ (tick)
function grillFlip(rt, f, p) {
  const g = f.grill, G = FUN.grill;
  if (!g || g.state !== "cook" || g.by !== p.id) return false;
  const now = Date.now(), k = (now - g.t0) / g.len, kGrace = (now - G.graceMs - g.t0) / g.len;
  let mk;
  if (k < G.win[0]) { g.bonus -= 1; mk = "raw"; } else if (kGrace <= G.win[1]) { const mid = (G.win[0] + G.win[1]) / 2; if (Math.abs(k - mid) <= G.perfect) { g.bonus += 1; mk = "perfect"; } else mk = "good"; } else { mk = "late"; }
  g.marks.push(mk);
  if (g.stage === 0) {
    g.stage = 1; g.t0 = now; g.len = G.stages[1];
    fx("grillFlip", { id: p.id, mk, sfx: "sizzle" });
    return true;
  }
  const portions = Math.max(0, Math.min(G.max + 2, g.ids.length + g.bonus));
  g.state = portions > 0 ? "served" : "burnt";
  g.portions = portions;
  g.until = now + (portions > 0 ? G.keepMs : G.showMs);
  setProp(rt, "grill", "off");
  fx(portions > 0 ? "grillServe" : "grillBurnt", { id: p.id, mk, n: portions, sfx: portions > 0 ? "shop_chime" : null });
  return true;
}
function grillTake(rt, f, p) {
  const g = f.grill;
  if (!g || g.state !== "served" || g.portions <= 0 || g.took[p.id] || isDriver(rt, p)) return false;
  const combat = L.combat();
  if (p.hp >= combat.maxHpOf(p) && (p.armor || 0) >= combat.maxArmorOf(p)) return false;
  return goThen(rt, p, "grill", FUN.grill.takeReach, () => {
    if (f.grill !== g || g.state !== "served" || g.portions <= 0 || g.took[p.id]) return false;
    let hp = 0, ar = 0;
    if (p.hp < combat.maxHpOf(p)) { const h0 = p.hp; combat.healHp(p, FUN.grill.heal); hp = p.hp - h0; } else { const a0 = p.armor || 0; combat.healArmor(p, FUN.grill.armor); ar = (p.armor || 0) - a0; }
    if (!hp && !ar) return false;
    g.portions--; g.took[p.id] = true;
    if (g.portions <= 0) { g.state = "done"; g.until = Date.now() + 1500; }
    fx("grillTake", { id: p.id, hp, ar, sfx: "coin" });
    return true;
  });
}

// ---- 4) ผู้ส่องทาง + คนขับ
function spotToggle(rt, f, p) {
  if (f.spot[p.id]) { delete f.spot[p.id]; fx("spotOff", { id: p.id }); return true; }
  if (isDriver(rt, p)) return false;
  return goThen(rt, p, "binoc", 1, () => {
    if (f.spot[p.id] || isDriver(rt, p)) return false;
    f.spot[p.id] = true;
    f.lootNextAt = Math.max(f.lootNextAt || 0, Date.now() + FUN.spot.firstMs);
    fx("spotOn", { id: p.id });
    return true;
  });
}
function mark(rt, f, p, id) {
  const l = f.loot.find((x) => x.id === id);
  if (!f.spot[p.id] || !l || l.marked || l.at <= Date.now()) return false;
  l.marked = p.id;
  fx("mark", { id: p.id, loot: l.id, lane: l.lane, sfx: "pump_beep" });
  return true;
}
function spawnLoot(rt, f, now) {
  const S = FUN.spot;
  const busy = new Set(f.loot.map((l) => l.lane));
  const lanes = [-1, 0, 1].filter((x) => !busy.has(x));
  if (!lanes.length) return;
  const l = { id: ++f.lootSeq, lane: lanes[Math.floor(Math.random() * lanes.length)], at: now + S.leadMs, kind: Math.random() * 100 < S.itemPct ? "item" : "coin", marked: null };
  f.loot.push(l);
  f.lootNextAt = now + S.gap[0] + Math.random() * (S.gap[1] - S.gap[0]);
  f.dirty = true;
}
function resolveLoot(rt, f, l) {
  const RT = H(), S = FUN.spot;
  if (rt.van.lane !== l.lane) { fx("lootMiss", { loot: l.id, lane: l.lane }); return false; }
  let item = null, to = null;
  if (l.kind === "item") {
    const cand = [l.marked && match.players[l.marked], ...Object.keys(f.spot).map((id) => match.players[id]), ...RT.livePlayers()].filter((u) => u && u.alive && !u.summon);
    const give = { type: S.items[Math.floor(Math.random() * S.items.length)], value: 2 };
    for (const u of cand) if (L.shop().grantInventoryItem(u, { ...give })) { item = L.shop().shopItemName(give); to = u.id; break; }
  }
  const coin = RT.giveGoldAll(l.kind === "item" ? S.itemCoin : S.coin);
  fx("lootGet", { loot: l.id, lane: l.lane, kind: l.kind, coin: l.kind === "item" ? S.itemCoin : S.coin, got: coin, item, to, sfx: "cash" });
  match.lastLog.push(`📦 เก็บกล่องข้างทาง! ${item ? `${item} · ` : ""}ทุกคน +${l.kind === "item" ? S.itemCoin : S.coin} เหรียญ`);
  return true;
}

// ---- 5) ตู้เย็น / กล่องเครื่องมือ
function drink(rt, f, p) {
  if (f.fridge <= 0 || isDriver(rt, p)) return false;
  const combat = L.combat(), shop = L.shop();
  const need = () => shop.cleansableOf(p).length > 0 || p.hp < combat.maxHpOf(p);
  if (!need()) return false;
  return goThen(rt, p, "fridge", 1, () => {
    if (f.fridge <= 0 || !need()) return false;
    const keys = shop.cleansableOf(p);
    let cure = null, hp = 0;
    if (keys.length) { cure = keys[0]; delete p.statuses[cure]; if (p.statusAmt) delete p.statusAmt[cure]; if (p.statusAt) delete p.statusAt[cure]; }
    else { const h0 = p.hp; combat.healHp(p, FUN.fridge.heal); hp = p.hp - h0; }
    f.fridge--;
    setProp(rt, "fridge", "open");
    f.fridgeCloseAt = Date.now() + FUN.fridge.closeMs;
    fx("drink", { id: p.id, hp, cure, left: f.fridge, sfx: "splash" });
    return true;
  });
}
function restock(rt) { const f = ensure(rt); f.fridge = Math.max(f.fridge, FUN.fridge.stock); }
function repair(rt, f, p) {
  if (f.repair && f.repair.ids[p.id]) { repairAccrue(f, Date.now()); delete f.repair.ids[p.id]; if (!Object.keys(f.repair.ids).length) f.repair = null; return true; }
  if (isDriver(rt, p) || rt.van.hp >= rt.van.hpMax || (f.repairCd[p.id] || 0) > Date.now()) return false;
  return goThen(rt, p, "tool", 1, () => {
    if (isDriver(rt, p) || rt.van.hp >= rt.van.hpMax || (f.repairCd[p.id] || 0) > Date.now()) return false;
    const now = Date.now();
    if (!f.repair) { f.repair = { ids: {}, prog: 0, at: now }; setProp(rt, "tool", "open"); }
    repairAccrue(f, now);
    f.repair.ids[p.id] = true;
    fx("repairOn", { id: p.id, sfx: "wrench" });
    return true;
  });
}
function repairAccrue(f, now) { const r = f.repair; if (!r) return; r.prog += Math.max(0, now - r.at) * Object.keys(r.ids).length; r.at = now; }

// ---------------------------------------------------------------- จังหวะเวลา (เรียกเองทุก 200 ms ขณะมีกิจกรรม · เทสต์เรียก tick(now) ตรง)
function needsTick(f) { return !!f && (!!f.dice || !!f.jam || !!f.grill || !!f.repair || Object.keys(f.spot).length > 0 || f.loot.length > 0 || f.fridgeCloseAt > 0); }
function startTick() {
  if (tickId) return;
  tickId = setInterval(() => {
    try {
      const rt = match.roadtrip;
      if (!rt || !rt.fun || !needsTick(rt.fun)) { stopTick(); return; }
      if (tick(Date.now())) H().broadcast();
    } catch (err) { console.error("[roadtrip] vanfun tick:", err); stopTick(); }
  }, TICK_MS);
  if (tickId.unref) tickId.unref();
}
function stopTick() { if (tickId) clearInterval(tickId); tickId = null; }
// → true = มีอะไรเปลี่ยน (ควร broadcast)
function tick(now = Date.now()) {
  const rt = match.roadtrip;
  if (!rt || !rt.fun || !DRIVE_PHASES.has(rt.phase)) return false;
  const f = rt.fun;
  let ch = f.dirty; f.dirty = false;
  const alive = (id) => { const u = match.players[id]; return !!u && u.alive; };
  // เต๋า
  if (f.dice) {
    if (!f.dice.result && now >= f.dice.at) { diceRoll(rt, f, now); ch = true; }
    else if (f.dice.result && now >= f.dice.result.until) { f.dice = null; ch = true; }
  }
  // ดนตรี
  if (f.jam) {
    if (!f.jam.result && now >= f.jam.endAt) { jamEnd(rt, f, now); ch = true; }
    else if (f.jam.result && now >= f.jam.result.until) { f.jam = null; ch = true; }
  }
  // เตาปิ้ง: เลยเวลาไม่พลิก/เสิร์ฟ = ไหม้
  const g = f.grill;
  if (g) {
    if (g.state === "cook" && now >= g.t0 + g.len + FUN.grill.graceMs) {
      g.state = "burnt"; g.portions = 0; g.until = now + FUN.grill.showMs; setProp(rt, "grill", "off");
      fx("grillBurnt", { id: g.by }); ch = true;
    } else if (g.state !== "cook" && now >= g.until) { f.grill = null; ch = true; }
  }
  // ผู้ส่องทาง: ต้องยืนติดกล้อง ยังมีชีวิต ไม่ได้ขับ
  for (const id of Object.keys(f.spot)) {
    const u = match.players[id];
    if (!u || !u.alive || isDriver(rt, u) || dist(rt.vanPos && rt.vanPos[id], at("binoc")) > 1) { delete f.spot[id]; ch = true; }
  }
  for (const l of f.loot.filter((x) => x.at <= now)) { if (rt.phase === "drive") resolveLoot(rt, f, l); ch = true; }
  if (f.loot.some((x) => x.at <= now)) f.loot = f.loot.filter((x) => x.at > now);
  if (rt.phase === "drive" && Object.keys(f.spot).length && now >= f.lootNextAt && f.loot.length < FUN.spot.max) { spawnLoot(rt, f, now); ch = true; }
  // ตู้เย็นปิดเอง
  if (f.fridgeCloseAt && now >= f.fridgeCloseAt) { f.fridgeCloseAt = 0; setProp(rt, "fridge", "closed"); ch = true; }
  // ซ่อมรถ: คนที่ยังยืนติดกล่องเครื่องมือ · ครบ = รถ +1 แล้วพัก
  if (f.repair) {
    const r = f.repair;
    for (const id of Object.keys(r.ids)) {
      const u = match.players[id];
      if (!alive(id) || isDriver(rt, u) || dist(rt.vanPos && rt.vanPos[id], at("tool")) > 1) { repairAccrue(f, now); delete r.ids[id]; ch = true; }
    }
    repairAccrue(f, now);
    const ids = Object.keys(r.ids);
    if (!ids.length) { f.repair = null; setProp(rt, "tool", "closed"); ch = true; }
    else if (r.prog >= FUN.repair.needMs) {
      const hp0 = rt.van.hp;
      rt.van.hp = Math.min(rt.van.hpMax, rt.van.hp + FUN.repair.hp);
      for (const id of ids) f.repairCd[id] = now + FUN.repair.cdMs;
      f.repair = null; setProp(rt, "tool", "closed");
      fx("repairDone", { ids, hp: rt.van.hp - hp0, sfx: "upgrade" });
      match.lastLog.push(`🔧 ซ่อมรถตู้ระหว่างทาง +${rt.van.hp - hp0}`);
      ch = true;
    }
  }
  return ch;
}

// ---------------------------------------------------------------- ช่วงเปลี่ยน (index.setPhase / toDrive)
// ออกจากช่วงเดินทาง (สู้/จุดพัก/จบ) = ยกเลิกทุกวง คืนเงินกองกลางเต๋า · ช่วงอื่นที่ไม่ใช่ขับ = กล่องข้างทางหายไป (แบบสิ่งกีดขวาง)
function onPhase(rt, name) {
  if (!rt || !rt.fun) return;
  const f = rt.fun;
  if (name !== "drive") f.loot = [];
  if (DRIVE_PHASES.has(name)) return;
  cancelAll(rt);
}
function cancelAll(rt) {
  const f = rt && rt.fun;
  if (!f) return;
  const d = f.dice;
  if (d && !d.result) for (const id of d.ids) refund(match.players[id], d.ante);
  const any = !!(f.dice || f.jam || f.grill || f.repair || Object.keys(f.spot).length);
  f.dice = null; f.jam = null; f.grill = null; f.repair = null; f.spot = {}; f.loot = [];
  if (rt.vanProps) {
    if (rt.vanProps.grill) rt.vanProps.grill.state = "off";
    if (rt.vanProps.tool) rt.vanProps.tool.state = "closed";
    if (rt.vanProps.fridge && f.fridgeCloseAt) rt.vanProps.fridge.state = "closed";
  }
  f.fridgeCloseAt = 0;
  if (any) H().fx("fun", { f: "cancel" });
  stopTick();
}
// กลับมาขับ = ช่วงใหม่ (โควตาดนตรี/ปิ้งย่างต่อช่วง)
function onDrive(rt) { const f = ensure(rt); f.leg++; }

// ---------------------------------------------------------------- state.roadtrip.fun
function publicInfo(rt, viewerId = null) {
  const f = rt && rt.fun;
  if (!f) return null;
  const now = Date.now(), spotter = !!(viewerId && f.spot[viewerId]);
  const d = f.dice, j = f.jam, g = f.grill, r = f.repair;
  return {
    dice: d ? { by: d.by, ante: d.ante, pot: d.pot, ids: [...d.ids], at: d.at, result: d.result ? { rolls: { ...d.result.rolls }, house: d.result.house, win: [...d.result.win], gain: { ...d.result.gain }, until: d.result.until } : null } : null,
    jam: j ? { by: j.by, startAt: j.startAt, endAt: j.endAt, bpm: j.bpm, chart: j.chart, ids: Object.fromEntries(Object.entries(j.ids).map(([id, v]) => [id, Math.round(v.pts * 10) / 10])), result: j.result } : null,
    jamUsed: f.jamLeg === f.leg,
    grill: g ? { by: g.by, ids: [...g.ids], stage: g.stage, t0: g.t0, len: g.len, state: g.state, portions: g.portions, took: Object.keys(g.took), until: g.until, marks: [...g.marks] } : null,
    grillLeft: Math.max(0, FUN.grill.perLeg - grillUses(f)),
    spot: Object.keys(f.spot),
    // กล่องข้างทาง: ผู้ส่องทางเห็นทุกกล่อง · คนอื่นเห็นเฉพาะหมุดเลน (ปักแล้ว) หรือกล่องที่ใกล้ถึง ≤ 2.5 วิ
    loot: f.loot.filter((l) => spotter || l.marked || l.at - now <= FUN.spot.seeMs).map((l) => ({ id: l.id, lane: l.lane, at: l.at, kind: spotter || l.at - now <= FUN.spot.seeMs ? l.kind : null, marked: l.marked, hidden: !spotter && l.at - now > FUN.spot.seeMs })),
    fridge: f.fridge, fridgeMax: FUN.fridge.stock,
    repair: r ? { ids: Object.keys(r.ids), prog: r.prog, at: r.at, need: FUN.repair.needMs } : null,
    repairCd: viewerId ? Math.max(0, (f.repairCd[viewerId] || 0) - now) : 0,
    cfg: { antes: FUN.dice.antes, diceMax: FUN.dice.max, goodMs: FUN.jam.goodMs, perfectMs: FUN.jam.perfectMs, lanes: FUN.jam.lanes, joinCutMs: FUN.jam.joinCutMs, win: FUN.grill.win, perfect: FUN.grill.perfect, grillMax: FUN.grill.max, seeMs: FUN.spot.seeMs, heal: FUN.grill.heal, drinkHeal: FUN.fridge.heal, repairHp: FUN.repair.hp, tiles: TILE },
  };
}

module.exports = { FUN, TILE, DRIVE_PHASES, ensure, command, tick, startTick, stopTick, onPhase, onDrive, cancelAll, restock, publicInfo, chartOf, jamScore };

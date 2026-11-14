// Road Trip: จุดพัก (ปั๊ม 150 วิ / โมเต็ล 60 วิ) — กระดาน 2D เดิม เดินอิสระไม่จำกัดระยะ ไม่มีตาเดิน (contract §2)
//  เดิน (rt:walk) = BFS ไม่จำกัดก้าว · ผ่านเพื่อนได้ หยุดซ้อนไม่ได้ (กฎ Fire Emblem — GRID_PLAN §8.8) · ไม่ผ่านสิ่งกีดขวาง/ร้าน
//  กิจกรรม (rt:act) = วัตถุบนแผนที่ (maps.js props ที่มี spot) — ต้องยืนติด (server เดินไปให้ถ้ายังไม่ติด) · ใช้ได้คนละครั้งต่อจุดพัก (ยกเว้นตู้น้ำมัน)
//  ร้าน = ระบบร้านเดิม (shop.js) ที่ shopSpots — ซื้อได้นอกตาเดินขณะอยู่จุดพัก (RT.freeShop)
//  ฟื้น: ปั๊ม = คนที่ล้มฟื้น 50% · โมเต็ล = ฟื้นเต็ม + ทุกคนเลือดเต็ม · หมดเวลา/ทุกคนกดพร้อม = ขับต่อ
const match = require("../match");
const Board = require("../board");
const Maps = require("./maps");
const Van = require("./van");
const { diffOf, priceOf } = require("./diff");

const H = () => require("./index");
const L = { action: () => require("../phases/action"), shop: () => require("../shop"), combat: () => require("../combat") };
const ACT_CD_MS = 1500;
const UPG_NAMES = { body: "ตัวถัง", engine: "เครื่องยนต์", tank: "ถังน้ำมัน", susp: "ช่วงล่าง", nitro: "ไนตรัส", turret: "ป้อมปืน", bumper: "กันชน", storage: "ที่เก็บของ" };
const REPEAT = new Set(["pump", "garage"]); // ใช้ซ้ำได้ในจุดพักเดียว
const FUEL_PER_GOLD = 4; // ลิตรต่อ 1 เหรียญ (÷ ราคาความยาก)
const DOG_FEEDS = 3;
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const K = Board.key;

function enter(kind) {
  const RT = H(), rt = match.roadtrip;
  const devArea = Number(process.env.ECHO_DEV_RT_AREA); // dev: บังคับแบบปั๊ม (72/73/74) ตอน QA
  const area = kind === "motel" ? Maps.RT_MOTEL : Maps.RT_GAS.includes(devArea) ? devArea : pick(Maps.RT_GAS);
  rt.stops++;
  rt.legs = 0;
  // ฟื้นคนที่ล้มก่อนวางกระดาน (placeOnBoard วางเฉพาะคนที่ยังอยู่)
  for (const p of RT.crew()) if (!p.alive) RT.raise(p, kind === "motel" ? 1 : 0.5);
  if (kind === "motel") {
    const combat = L.combat();
    for (const p of RT.crew().filter((u) => u.alive)) { p.hp = combat.maxHpOf(p); p.armor = Math.max(p.armor || 0, combat.maxArmorOf(p)); }
    rt.van.hp = Math.min(rt.van.hpMax, rt.van.hp + Math.ceil(rt.van.hpMax / 2)); // ซ่อมรถครึ่งหนึ่ง
    match.lastLog.push("🏨 พักโรงแรม — ทุกคนฟื้นเต็ม");
  }
  rt.van.nitro = Van.statOf(rt.van, "nitro"); // ไนตรัสเติมเต็มทุกจุดพัก
  if (kind === "gas") require("./vanfun").restock(rt); // ตู้เย็นในรถ: เติมเครื่องดื่มที่ปั๊ม
  rt.van.rearOpen = false;
  match.board = null;
  L.action().placeOnBoard(area);
  const s = openShops(rt, area, kind);
  rt.stop = { kind, area, ready: {}, cd: {}, used: {}, shopId: s ? s.id : null, shopProp: s ? s.prop : null };
  RT.setPhase("stop", Number(process.env.ECHO_DEV_RT_STOP_SECS) || (kind === "motel" ? RT.SECS.motel : RT.SECS.gas), leave); // dev: ECHO_DEV_RT_STOP_SECS = เวลาจุดพักยาวพิเศษ (QA)
  RT.fx("stop", { kind, area });
  RT.broadcast();
}
// ร้านเดียวต่อจุดพัก = ตัวอาคาร (ผู้ใช้สั่ง 2026-11-14 "ร้านค้าอันเล็กนิดเดียว ไม่รวมกับร้านค้าอื่นในปั๊มไปเลยล่ะ")
//  ปั๊ม = มินิมาร์ท (prop "mart") ขายรวมทุกแคตตาล็อก (ร้านยา + โรงช่าง + พ่อค้าเร่) + ของโหมด (ขนนก/ปลาย่าง — shop.syncStageItems)
//  โมเต็ล = สำนักงาน (prop "motel" style "office") ของน้อยกว่า · ร้านกินช่องทั้งตัวอาคาร (ซ้อนสิ่งกีดขวางเดิม) → ยืนติดอาคารตรงไหนก็ซื้อได้
//  ไม่มีแผงร้านแยกบนแผนที่ (publicShops building: true — client ไม่วาดแผง) · อู่ = อัปเกรด/ของแต่งอย่างเดียว
const OFFICE_ITEMS = ["armor", "cleanse", "resist", "fortune", "lifeCrystal"];
function shopProp(d, kind) {
  const props = (d && d.props) || [];
  return kind === "motel"
    ? props.find((o) => o.kind === "motel" && o.style === "office") || props.find((o) => o.kind === "motel")
    : props.find((o) => o.kind === "mart");
}
function openShops(rt, area, kind) {
  const shop = L.shop(), d = Maps.defs[area];
  shop.clearShops();
  const o = shopProp(d, kind);
  if (!o) return null;
  const shopKind = kind === "motel" ? "rtoffice" : "rtmart";
  const s = shop.openShopAt(shopKind, o.x0, o.y0, { w: o.x1 - o.x0 + 1, h: o.y1 - o.y0 + 1, rt: true, building: true, prop: o.id });
  if (shopKind === "rtoffice") s.items = s.items.filter((it) => OFFICE_ITEMS.includes(it.type));
  // ยาก: ขนนกคืนชีพไม่ขายประจำ — สุ่มเป็นของหายากที่มินิมาร์ท 30%
  if (shopKind === "rtmart" && diffOf(rt).revive == null && Math.random() < 0.3) s.items.push({ id: `${s.id}_rtrevive_rare_${Date.now()}`, type: "rtRevive", price: priceOf(rt, 14), stockBase: 1, bought: 0, sold: false, soldTo: null });
  shop.refreshShopForJourney();
  return s;
}
function leave() {
  const RT = H(), rt = match.roadtrip;
  if (!rt || rt.phase !== "stop") return;
  L.shop().clearShops();
  rt.stop = null;
  RT.fx("leave", {});
  RT.toDrive();
}

// ---------- วัตถุ/กิจกรรม ----------
function propsOf(rt) { const d = rt.stop && Maps.defs[rt.stop.area]; return (d && d.props) || []; }
function propById(rt, id) { return propsOf(rt).find((o) => o.id === id && o.spot) || null; }
const touchesProp = (pos, o) => Math.max(o.x0 - pos.x, 0, pos.x - o.x1) + Math.max(o.y0 - pos.y, 0, pos.y - o.y1) === 1;
const ACT_KINDS = new Set(["mart", "garage", "pump", "claw", "gacha", "arcade", "karaoke", "fortune", "spicy", "dog", "wash", "wc", "pond", "ferris", "bbq", "vending", "motel", "stall", "pool"]);
// คูลดาวน์/ใช้แล้ว แยกรายคน (QA 2026-11-14 — เดิมทั้งทีมใช้ร่วม) · viewerId = ผู้ดู (ไม่ส่ง = ไม่มีข้อมูลรายคน)
const cdKey = (pid, objId) => `${pid}:${objId}`;
function publicActs(rt, viewerId = null) {
  const out = {}, now = Date.now(), used = (viewerId && rt.stop.used[viewerId]) || {};
  for (const o of propsOf(rt)) if (ACT_KINDS.has(o.kind)) out[o.id] = { cd: viewerId ? Math.max(0, (rt.stop.cd[cdKey(viewerId, o.id)] || 0) - now) : 0, kind: o.kind, ...(used[o.id] ? { used: true } : {}) };
  return out;
}

// ระบบคู่ (เคท & เอมิลิโกะ / Echo อีกคน): unitId = ตัวไหนของผู้เล่นคนนี้ (ตรวจว่าเป็นของคนนี้จริง — Duo.unitsOf)
//  นอกตาเดิน Duo.controlledId ไม่สลับ → client เลือกตัวเองที่จุดพักแล้วส่ง unitId มากับ rt:walk / rt:act / rt:use / rt:upg (QA 2026-11-14)
function unitOf(p, o) {
  if (!o || o.unitId == null) return p;
  return require("../duo").unitsOf(p).find((x) => x.id === o.unitId) || null;
}
function command(p, name, o) {
  const rt = match.roadtrip;
  if (name === "use") { const u = unitOf(p, o); return !!u && useItem(u, o); }
  if (rt.phase !== "stop" || !rt.stop) return false;
  if (name === "ready") {
    if (rt.stop.ready[p.id]) delete rt.stop.ready[p.id]; else rt.stop.ready[p.id] = true;
    const RT = H();
    if (RT.awake().length && RT.awake().every((u) => rt.stop.ready[u.id])) { leave(); return true; }
    return true;
  }
  p = unitOf(p, o);
  if (!p) return false;
  if (!p.alive || !p.pos) return false;
  if (name === "walk") return walk(p, Number(o.x), Number(o.y));
  if (name === "act") return act(p, typeof o.id === "string" ? o.id : "");
  return false;
}
// ช่องที่เดินถึง (ไม่จำกัดระยะ · ผ่านเพื่อนได้แต่หยุดไม่ได้)
function reachOf(p) {
  const action = L.action();
  const units = action.boardUnits("*").filter((u) => u.id !== p.id);
  return Board.reachable(action.boardMap(), { id: p.id, x: p.pos.x, y: p.pos.y, size: 1 }, 999, units, { isAlly: () => true, blocked: action.boardBlocked(p.id) });
}
function walk(p, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || (x === p.pos.x && y === p.pos.y)) return false;
  const reach = reachOf(p);
  if (!reach.get(K(x, y))) return false;
  const path = Board.pathTo(reach, x, y);
  const from = p.pos;
  p.pos = { x, y };
  H().fx("walk", { id: p.id, path: path.map((t) => ({ x: t.x, y: t.y })) });
  const rt = match.roadtrip, garage = propsOf(rt).find((o) => o.kind === "garage");
  // client เปิดหน้าอู่ — เฉพาะตอนเพิ่งเดินมาติดอู่ (QA 2026-11-14: เดิน WASD เลียบอู่ = หน้าอู่เด้งทุกก้าวหลังปิดไปแล้ว)
  if (garage && touchesProp(p.pos, garage) && !touchesProp(from, garage)) H().fx("garage", { pid: p.id });
  return true;
}
function act(p, id) {
  const RT = H(), rt = match.roadtrip;
  const o = propById(rt, id);
  if (!o || !ACT_KINDS.has(o.kind)) return false;
  const now = Date.now();
  // ทำไม่ได้ = fx actFail ให้คนกดเห็น/ได้ยิน (QA 2026-11-14 — เดิมเงียบ ไม่รู้ว่าทำไมกดไม่ติด) · ถ้าเดินไปแล้ว ต้อง broadcast ตำแหน่งใหม่ด้วย
  const fail = (why) => { RT.fx("actFail", { id: p.id, obj: o.id, kind: o.kind, why }); RT.broadcast(); return false; };
  if ((rt.stop.cd[cdKey(p.id, o.id)] || 0) > now) return fail("cd");
  const used = rt.stop.used[p.id] || (rt.stop.used[p.id] = {});
  if (used[o.id] && !REPEAT.has(o.kind)) return fail("used");
  // ยังไม่ติดวัตถุ = เดินไปช่อง spot (หรือช่องว่างที่ติดวัตถุ) — walk() ส่ง fx garage เองเมื่อถึงอู่
  let walked = false;
  if (!touchesProp(p.pos, o)) {
    const reach = reachOf(p);
    const goals = [o.spot, ...[...reach.values()].filter((n) => touchesProp(n, o)).map((n) => [n.x, n.y])];
    const g = goals.find(([x, y]) => reach.get(K(x, y)));
    if (!g || !walk(p, g[0], g[1])) return fail("far");
    walked = true;
  }
  if (o.kind === "garage" && !walked) RT.fx("garage", { pid: p.id });
  if (o.id === rt.stop.shopProp && rt.stop.shopId) { RT.fx("shop", { pid: p.id, shopId: rt.stop.shopId }); return true; } // อาคารร้าน = เปิดหน้าร้าน
  if (o.kind === "garage") return true; // อู่ = เปิดหน้าอู่ (fx garage) — ซ่อมด้วยปุ่มในหน้าอู่ (rt:upg { key: "repair" })
  const g0 = p.gold || 0, hp0 = p.hp, nb0 = (rt.buffs[p.id] || []).length;
  const res = doAct(rt, p, o);
  if (!res || res.fail) return fail(res ? res.fail : "none"); // broadcast แล้ว (รวมตำแหน่งที่เพิ่งเดินไป)
  rt.stop.cd[cdKey(p.id, o.id)] = now + ACT_CD_MS;
  if (!REPEAT.has(o.kind)) used[o.id] = true;
  // ผลที่ client ลอยตัวเลขให้ดู (เหรียญ/เลือด/บัฟ) — คำนวณจากของจริง ไม่ต้องเดาจากแต่ละกิจกรรม
  const extra = { dg: (p.gold || 0) - g0 };
  if (p.hp !== hp0) extra.dhp = p.hp - hp0;
  const nb = (rt.buffs[p.id] || []).slice(nb0);
  if (nb.length) extra.buffs = nb.map((b) => ({ key: b.key, amt: b.amt, name: b.name, debuff: !!b.debuff }));
  RT.fx("act", { id: p.id, obj: o.id, kind: o.kind, ...res, ...extra });
  if (res.text) match.lastLog.push(`🎪 ${p.name} ${res.text}`);
  return true;
}
const pay = (p, n) => { if ((p.gold || 0) < n) return false; p.gold -= n; return true; };
function grant(p, type, value) { const sh = L.shop(); return sh.grantInventoryItem(p, { type, value }) ? sh.shopItemName({ type, value }) : null; }
function nextFight(rt, p, b) { (rt.buffs[p.id] || (rt.buffs[p.id] = [])).push(b); }

// ผลของกิจกรรม → { text, ...ข้อมูล fx } | null (ทำไม่ได้ — ไม่เสียอะไร)
function doAct(rt, p, o) {
  const d = diffOf(rt);
  switch (o.kind) {
    case "garage": { // ซ่อมรถ: 1 เหรียญ (× ราคาความยาก) ต่อ 3 HP · จ่ายเท่าที่มี · ใช้ซ้ำได้
      const need = rt.van.hpMax - rt.van.hp;
      if (need <= 0) return { fail: "full" };
      const per = 3 / d.price, cost = Math.ceil(need / per), paid = Math.min(cost, p.gold || 0);
      if (paid <= 0) return { fail: "gold" };
      p.gold -= paid;
      const hp = Math.min(need, Math.round(paid * per));
      rt.van.hp += hp;
      return { text: `ซ่อมรถตู้ +${hp} (-${paid} เหรียญ)`, hp, gold: paid };
    }
    case "pump": {
      const need = rt.van.fuelMax - rt.van.fuel;
      if (need < 0.5) return { fail: "full" };
      const perGold = FUEL_PER_GOLD / d.price;
      const cost = Math.ceil(need / perGold);
      const paid = Math.min(cost, p.gold || 0);
      if (paid <= 0) return { fail: "gold" };
      p.gold -= paid;
      const liters = Math.min(need, paid * perGold);
      rt.van.fuel = Math.min(rt.van.fuelMax, rt.van.fuel + liters);
      return { text: `เติมน้ำมัน +${Math.round(liters)} ลิตร (-${paid} เหรียญ)`, liters: Math.round(liters), gold: paid };
    }
    case "claw": case "gacha": {
      if (!pay(p, priceOf(rt, 2))) return { fail: "gold" };
      const r = Math.random();
      if (r < 0.4) { const it = grant(p, pick(["armor", "cleanse", "fortune", "rtFish"]), 2); return { text: it ? `ได้ ${it}` : "กระเป๋าเต็ม", win: !!it, item: it }; }
      if (r < 0.7) { const g = 1 + Math.floor(Math.random() * 4); L.shop().addGold(p, g); return { text: `ได้ ${g} เหรียญ`, win: true, gold: g }; }
      return { text: o.kind === "claw" ? "คีบพลาด" : "ได้แคปซูลเปล่า", win: false };
    }
    case "arcade": if (!pay(p, 1)) return { fail: "gold" }; nextFight(rt, p, { key: "might", amt: 1, turns: 2, name: "เสริมพลัง" }); return { text: "ตู้เกม — เสริมพลัง +1", buff: "might" };
    case "karaoke": if (!pay(p, 1)) return { fail: "gold" }; nextFight(rt, p, { key: "guard", amt: 1, turns: 2, name: "คุ้มครอง" }); return { text: "คาราโอเกะ — คุ้มครอง +1", buff: "guard" };
    case "fortune": if (!pay(p, priceOf(rt, 2))) return { fail: "gold" }; nextFight(rt, p, { key: "evade", amt: 30, turns: 2, name: "หลบหลีก" }); return { text: "หมอดู — หลบหลีก 30%", buff: "evade" };
    case "spicy": {
      if (Math.random() < 0.6) { nextFight(rt, p, { key: "might", amt: 2, turns: 2, name: "เสริมพลัง" }); return { text: "เผ็ดจัด! เสริมพลัง +2", buff: "might", win: true }; }
      nextFight(rt, p, { key: "stun", amt: 1, turns: 1, debuff: true, name: "สตั้น" });
      return { text: "เผ็ดเกิน! สตั้น", buff: "stun", win: false };
    }
    case "dog": {
      if (rt.dog.on) return { fail: "full" };
      if (rt.dog.lastStop === rt.stops) return { fail: "used" };
      if (!pay(p, 1)) return { fail: "gold" };
      rt.dog.lastStop = rt.stops;
      rt.dog.fed++;
      if (rt.dog.fed >= DOG_FEEDS) { rt.dog.on = true; return { text: "หมาขึ้นรถตู้แล้ว!", fed: rt.dog.fed, join: true }; }
      return { text: `ให้อาหารหมา (${rt.dog.fed}/${DOG_FEEDS})`, fed: rt.dog.fed };
    }
    case "wash": {
      if (!pay(p, 1)) return { fail: "gold" };
      const shop = L.shop();
      let n = 0;
      for (const u of H().crew().filter((x) => x.alive)) for (const k of shop.cleansableOf(u)) { delete u.statuses[k]; if (u.statusAmt) delete u.statusAmt[k]; n++; }
      for (const pid of Object.keys(rt.buffs)) rt.buffs[pid] = (rt.buffs[pid] || []).filter((b) => !b.debuff);
      return { text: `ล้างรถตู้ — ล้างสถานะ ${n}`, n };
    }
    case "wc": {
      const reach = [...reachOf(p).values()].filter((t) => t.x !== p.pos.x || t.y !== p.pos.y);
      const t = pick(reach);
      if (!t) return { fail: "far" };
      const from = { ...p.pos };
      p.pos = { x: t.x, y: t.y };
      const it = Math.random() < 0.2 ? grant(p, pick(["cleanse", "armor", "rtFish"]), 2) : null;
      return { text: it ? `ห้องน้ำปริศนา — วาร์ป! เจอ ${it}` : "ห้องน้ำปริศนา — วาร์ป!", warp: { from, to: { ...p.pos } }, item: it };
    }
    case "pond": {
      if (Math.random() < 0.5) { const it = grant(p, "rtFish"); return { text: it ? "ได้ปลา!" : "กระเป๋าเต็ม", win: !!it }; }
      return { text: "ปลาไม่กิน", win: false };
    }
    case "ferris": // เห็นทางแยกแล้วทั้งทีม = คนถัดไปไม่ต้องจ่ายซ้ำ
      if (rt.reveal) return { fail: "used" };
      if (!pay(p, 1)) return { fail: "gold" };
      rt.reveal = true;
      return { text: "ชิงช้าสวรรค์ — เห็นทางแยกข้างหน้า", reveal: true };
    // สระว่ายน้ำโมเต็ล — เดิมมีช่องยืนแต่กดแล้วไม่มีอะไรเกิด (QA 2026-11-14) · ฟรี: สู้ครั้งหน้า หลบหลีก 20% 2 เทิร์น
    case "pool": nextFight(rt, p, { key: "evade", amt: 20, turns: 2, name: "หลบหลีก" }); return { text: "ว่ายน้ำ — หลบหลีก 20%", buff: "evade" };
    case "bbq": if (p.hp >= L.combat().maxHpOf(p)) return { fail: "full" }; L.combat().healHp(p, 2); return { text: "ปิ้งย่าง — พลังชีวิต +2", heal: 2 };
    // แผงอาหารตลาดนัด (ปั๊ม C) — เดิมมีช่องยืนแต่กดแล้วไม่มีอะไรเกิด (QA 2026-11-14) · 1 เหรียญ: ของกิน = พลังชีวิต +2 · น้ำ = เกราะ +1
    case "stall": {
      const combat = L.combat();
      if (o.style === "drinks") { if (p.armor >= combat.maxArmorOf(p)) return { fail: "full" }; if (!pay(p, 1)) return { fail: "gold" }; combat.healArmor(p, 1); return { text: "น้ำเย็น — เกราะ +1", armor: 1 }; }
      if (p.hp >= combat.maxHpOf(p)) return { fail: "full" };
      if (!pay(p, 1)) return { fail: "gold" };
      combat.healHp(p, 2);
      return { text: "ของกินตลาดนัด — พลังชีวิต +2", heal: 2 };
    }
    case "vending": { if (!pay(p, 1)) return { fail: "gold" }; const it = grant(p, "armor", 2); return { text: it ? `ได้ ${it}` : "กระเป๋าเต็ม", item: it }; }
    case "motel": { // ห้องพัก: เลือดเต็ม + ล้างสถานะผิดปกติทั้งหมด (เข้าโมเต็ลก็เลือดเต็มอยู่แล้ว — ห้องพักจึงต้องล้างสถานะด้วยถึงจะมีประโยชน์ · QA 2026-11-14)
      const combat = L.combat(), keys = L.shop().cleansableOf(p);
      if (p.hp >= combat.maxHpOf(p) && !keys.length) return { fail: "full" };
      combat.healHp(p, 99);
      for (const k of keys) { delete p.statuses[k]; if (p.statusAmt) delete p.statusAmt[k]; }
      return { text: "พักผ่อน — พลังชีวิตเต็ม", heal: 99, n: keys.length };
    }
    default: return null;
  }
}

// ---------- อู่: อัปเกรดรถ (คนกดจ่าย) ----------
// ค่าซ่อมรถเต็ม (เหรียญ) — ปุ่มซ่อมในหน้าอู่ (null = รถเต็ม)
function repairCost(rt) {
  const need = rt.van.hpMax - rt.van.hp;
  return need > 0 ? Math.ceil(need / (3 / diffOf(rt).price)) : null;
}
function upgrade(p, key, unitId) {
  const RT = H(), rt = match.roadtrip;
  if (unitId != null) { p = unitOf(p, { unitId }); if (!p) return false; } // ระบบคู่: ตัวที่ยืนใกล้อู่
  if (rt.phase !== "stop" || !rt.stop || rt.stop.kind !== "gas" || !(Van.UPG_KEYS.includes(key) || key === "repair") || !p.alive || !p.pos) return false;
  const garage = propsOf(rt).find((o) => o.kind === "garage");
  if (garage && Math.max(garage.x0 - p.pos.x, 0, p.pos.x - garage.x1) + Math.max(garage.y0 - p.pos.y, 0, p.pos.y - garage.y1) > 2) return false;
  // ซ่อมรถ = ปุ่มในหน้าอู่ (QA 2026-11-14 — เดิมกดตัวอาคารอู่ = จ่ายค่าซ่อมทันทีโดยไม่ถาม) · จ่ายเท่าที่มี
  if (key === "repair") {
    const res = doAct(rt, p, garage || { kind: "garage" });
    if (!res || res.fail) return false;
    RT.fx("act", { id: p.id, obj: garage ? garage.id : null, kind: "garage", ...res, dg: -res.gold });
    match.lastLog.push(`🔧 ${p.name} ${res.text}`);
    return true;
  }
  const cost = Van.upgCost(rt, key);
  if (cost == null || !pay(p, cost)) return false;
  const lv = Van.applyUpgrade(rt.van, key);
  RT.fx("upgrade", { id: p.id, key, lv });
  match.lastLog.push(`🔧 ${p.name} อัปเกรด${UPG_NAMES[key]} ขั้น ${lv} (-${cost} เหรียญ)`);
  return true;
}

// ---------- ใช้ไอเทมนอกการต่อสู้ (rt:use — จุดพัก) : ขนนกคืนชีพ / ปลา / ยาเกราะ / ยาล้างสถานะ ----------
function useItem(p, o) {
  const RT = H(), rt = match.roadtrip;
  if (rt.phase === "combat" || rt.phase === "over" || !p.alive) return false;
  const inv = p.inventory || [];
  const idx = inv.findIndex((it) => it.uid === o.uid);
  if (idx < 0) return false;
  const it = inv[idx], combat = L.combat();
  if (it.type === "rtRevive") {
    const t = (o.targetId && match.players[o.targetId]) || RT.crew().find((u) => !u.alive);
    if (!t || t.alive || t.summon) return false;
    const spot = rt.phase === "stop" && p.pos ? L.action().nearFreeTile(p.pos) : null;
    if (rt.phase === "stop" && !spot) return false; // ไม่มีช่องให้ยืน = ไม่ใช้ (ไม่เสียของ · ไม่ฟื้นแบบไม่มีตำแหน่ง)
    RT.raise(t, 0.5, spot);
  } else if (it.type === "rtFish") {
    if (p.hp >= combat.maxHpOf(p)) return false;
    combat.healHp(p, 3);
  } else if (it.type === "armor") {
    if (p.armor >= combat.maxArmorOf(p)) return false;
    combat.healArmor(p, it.value || 2);
  } else if (it.type === "cleanse") {
    // เหมือนตอนสู้ (shop.js): เลือกสถานะเอง (o.status) ลด 1 ขั้น — ไม่ส่งมา = สถานะแรกที่ล้างได้ (เดิมล้างทุกอย่างหมด ไม่ตรงคำอธิบาย — QA 2026-11-14)
    const keys = L.shop().cleansableOf(p);
    const k = keys.includes(String(o.status || "")) ? String(o.status) : keys[0];
    if (!k) return false;
    p.statuses[k]--;
    if (p.statuses[k] <= 0) { delete p.statuses[k]; if (p.statusAmt) delete p.statusAmt[k]; if (p.statusAt) delete p.statusAt[k]; }
  } else return false;
  inv.splice(idx, 1);
  RT.fx("use", { id: p.id, type: it.type });
  return true;
}

module.exports = { ACT_KINDS, FUEL_PER_GOLD, DOG_FEEDS, enter, leave, command, walk, act, doAct, upgrade, repairCost, useItem, publicActs, reachOf, propById };

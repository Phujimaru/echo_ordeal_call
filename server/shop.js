// เหรียญ + ร้านค้ามายา + ไอเทม/ปืน GUTS
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  goldCapOf, addGold, rollShopItem, shopItemName, openShop, refreshShopForJourney, journeyGiftItem,
  shopDue, relocateShop, maybeMoveShop, shopTurnsLeft, bagFull, dropItem,
  giveItem, swapItem,
  grantInventoryItem, hasGutsGun, hasGutsWeapon, asleep, viewShop, buyShopItem,
  cardLabel, useInventoryItem, useDrawItem, gutsFireTargetOf, applyGutsBullet,
});

const CHAR_HOOKS = require("../characters/index");
const Mark42 = require("../characters/_mark42");
const Journey = require("../characters/_journey");
const {
  BAG_SLOTS, FORTUNE_MAX, GOLD_MAX, GUTS_AMMO, GUTS_AMMO_IDS, GUTS_CHAA_TURNS, GUTS_GUN_PRICE, GUTS_NURSE_DMG,
  GUTS_RANGE, SHOP_AMMO_WEIGHTS, SHOP_ARMOR_AMOUNT, SHOP_ARMOR_PRICE, SHOP_INTERVAL_TURNS,
  SHOP_CARD_COLOR_PRICE, SHOP_FORTUNE_AMOUNT, SHOP_FORTUNE_PRICE, SHOP_MAX_GUNS, SHOP_MAX_ITEMS, SHOP_MAX_MARK42,
  SHOP_RESIST_PRICE, SHOP_RESIST_TURNS, SHOP_SKILL_SIZES, SHOP_WEIGHTS,
} = require("./constants");
const Board = require("./board");
const cardDeck = require("./deck");
const Duo = require("./duo");
const match = require("./match");
const { engine } = require("./engine");
const action = require("./phases/action");
const attack = require("./phases/attack");
const characterRules = require("./characterRules");
const combat = require("./combat");
const cutscene = require("./cutscene");
const timers = require("./timers");
const view = require("./view");
const Visibility = require("./visibility");
const Zero = require("./zeroTime");
const Dim = require("./dimension");
const Colony = require("./colony");

// เพดานเหรียญรายบุคคล
function goldCapOf(p) {
  return GOLD_MAX;
}
// จุดเดียวที่ "ได้รับเหรียญ" ผ่าน — คืนจำนวนที่เข้ากระเป๋าจริงหลังตัดตามเพดาน
function addGold(p, n) {
  if (!p || !(n > 0)) return 0;
  const cap = goldCapOf(p);
  const before = p.gold || 0;
  if (before >= cap) return 0;
  p.gold = Math.min(cap, before + n);
  return p.gold - before;
}

// ---------- ร้านค้ามายา (patch 2.3: ยุบร้านลุงเท่งเข้ามาเป็นร้านเดียว) ----------
// สุ่มสินค้า 1 ชิ้นตามน้ำหนักใน SHOP_WEIGHTS
//   allowGun = false (ปืนครบ SHOP_MAX_GUNS แล้ว) / allowMark42 = false (ชุดครบ SHOP_MAX_MARK42 แล้ว)
//   -> น้ำหนักของที่เต็มโควตาตกไปรวมกับกระสุนธรรมดา
function pickWeighted(entries) {
  const total = entries.reduce((n, e) => n + e.w, 0);
  let r = Math.random() * total;
  for (const e of entries) { r -= e.w; if (r <= 0) return e.key; }
  return entries[entries.length - 1].key;
}
function rollShopAmmo() {
  const ammoId = pickWeighted(GUTS_AMMO_IDS.map((id) => ({ key: id, w: SHOP_AMMO_WEIGHTS[id] || 1 })));
  return { type: "gutsAmmo", ammo: ammoId, price: GUTS_AMMO[ammoId].price };
}
function rollShopItem(allowGun = true, allowMark42 = true) {
  const weights = { ...SHOP_WEIGHTS };
  if (!allowMark42) { weights.gutsAmmo += weights.mark42; weights.mark42 = 0; }
  if (!allowGun) { weights.gutsAmmo += weights.gutsGun; weights.gutsGun = 0; }
  const type = pickWeighted(Object.entries(weights).map(([key, w]) => ({ key, w })));
  if (type === "cardColor") return { type: "cardColor", price: SHOP_CARD_COLOR_PRICE };
  if (type === "fortune") return { type: "fortune", price: SHOP_FORTUNE_PRICE };
  if (type === "resist") return { type: "resist", price: SHOP_RESIST_PRICE };
  if (type === "skillPoint") {
    const size = pickWeighted(SHOP_SKILL_SIZES.map((s) => ({ key: s.size, w: s.weight })));
    const s = SHOP_SKILL_SIZES.find((x) => x.size === size);
    return { type: "skillPoint", size: s.size, value: s.amount, price: s.price };
  }
  if (type === "gutsGun") return { type: "gutsGun", price: GUTS_GUN_PRICE };
  if (type === "mark42") return { type: "mark42", price: Mark42.PRICE };
  if (type === "gutsAmmo") return rollShopAmmo();
  return { type: "armor", value: SHOP_ARMOR_AMOUNT, price: SHOP_ARMOR_PRICE };
}
function shopItemName(item) {
  if (item.type === "cardColor") return "ยาเปลี่ยนสีการ์ด";
  if (item.type === "fortune") return "ยาโชคลาภ";
  if (item.type === "resist") return "ยาต้านสถานะ";
  if (item.type === "skillPoint") return `ยาฟื้นแต้มสกิล +${item.value}`;
  if (item.type === "armor") return `ยาฟื้นเกราะ +${item.value}`;
  if (item.type === "gutsGun") return "ปืนหน่วย GUTS Select";
  if (item.type === "mark42") return "เกราะ Mark 42";
  if (item.type === "gutsAmmo") return (GUTS_AMMO[item.ammo] || {}).name || "กระสุน";
  if (item.type === "kebread") return "ขนมปัง";
  if (item.type === "lawHeart") return `หัวใจของ ${item.targetName || "?"}`;
  return "สินค้า";
}
// เปิดร้านค้ามายา: สุ่มสินค้าใหม่ทั้งหมด SHOP_MAX_ITEMS ช่อง (สินค้าประเภทเดียวกันขึ้นซ้ำได้)
function openShop() {
  match.shopRoundSeq++;
  match.shopItems = [];
  let guns = 0;
  let suits = 0;
  for (let i = 0; i < SHOP_MAX_ITEMS; i++) {
    // การเดินทาง (คลื่นวงวนน้ำ กลางวัน): สุ่มซ้ำจนได้ของราคา 5 ขึ้นไป
    const rolled = Journey.filterShopRoll(engine, () => rollShopItem(guns < SHOP_MAX_GUNS, suits < SHOP_MAX_MARK42));
    if (rolled.type === "gutsGun") guns++;
    if (rolled.type === "mark42") suits++;
    match.shopItems.push({ id: `shop_${match.shopRoundSeq}_${i}`, ...rolled, sold: false, soldTo: null });
  }
  refreshShopForJourney();
  match.lastLog.push(`🏪 ร้านค้ามายาปรากฏ — มีสินค้า ${match.shopItems.length} ชิ้น: ${match.shopItems.map(shopItemName).join(", ")}`);
}
// การเดินทาง: ผลของภูมิภาคที่มีต่อร้านค้า "คิดใหม่ทุกต้นเทิร์น" (เรียกจาก dealRound + ตอนร้านเปิด + หลังซื้อ)
//  ร้านเปิดทุก 6 เทิร์นแต่ของค้างอยู่ข้ามช่วงเวลา — เดิมคิดผลครั้งเดียวตอนเปิดร้าน ผลจึงช้ากว่าช่วงจริงทั้งช่วง
//  (ร้านที่ปรากฏเทิร์น 6 ตอนกลางคืนของทุ่งดอกไม้ ของค้างข้ามไปถึงกลางวัน 7-9 และกลางคืนเทิร์น 10)
//  · ทุ่งดอกไม้ กลางคืน: ช่องละหลายชิ้น — นับที่ซื้อไปแล้ว (bought) เทียบเพดานของช่วงเวลาปัจจุบัน
//    sold = ครบเพดานแล้ว (client ใช้ sold ตัดสินว่ากดซื้อได้ไหม) · stock/stockMax ส่งไปโชว์ "เหลือ x/3"
//  · คลื่นวงวนน้ำ กลางวัน: ช่องที่ยังไม่มีใครซื้อและราคาต่ำกว่า 5 ถูกสุ่มใหม่เป็นของราคา 5 ขึ้นไป
function refreshShopForJourney() {
  // ทุกโหมดใช้ตัวนับ bought ตัดสิน sold — ผลของภูมิภาคทำงานเฉพาะโหมดที่มีการเดินทาง (Journey.is/shopStock)
  if (!match.shopItems.length) return;
  if (Journey.is(engine, 4, "day")) {
    for (let i = 0; i < match.shopItems.length; i++) {
      const it = match.shopItems[i];
      if ((it.bought || 0) > 0 || it.sold || it.price >= Journey.WHIRL_SHOP_MIN_PRICE) continue;
      const rolled = Journey.filterShopRoll(engine, () => rollShopItem(false, false)); // ไม่เพิ่มของโควตา (ปืน/Mark 42)
      match.shopItems[i] = { id: `${it.id}_w`, ...rolled, sold: false, soldTo: null };
    }
  }
  for (const it of match.shopItems) {
    // ของที่ขายไปก่อนมีตัวนับ bought (ร้านจาก snapshot/เวอร์ชันเก่า) ถือว่าซื้อไป 1 ชิ้น
    if (it.bought == null) it.bought = it.sold ? 1 : 0;
    const limit = Journey.shopStock(engine, it);
    it.sold = it.bought >= limit;
    if (limit > 1) { it.stock = Math.max(0, limit - it.bought); it.stockMax = limit; }
    else { delete it.stock; delete it.stockMax; }
  }
}
// การเดินทาง (ทุ่งดอกไม้ กลางวัน): ของฟรีราคาไม่เกิน 5 ที่ใช้ได้ทันที — ไม่มีกระสุน (ใช้ไม่ได้ถ้าไม่มีปืน)
function journeyGiftItem() {
  const small = SHOP_SKILL_SIZES.find((x) => x.size === "small");
  const pool = [
    { type: "armor", value: SHOP_ARMOR_AMOUNT, price: SHOP_ARMOR_PRICE },
    { type: "skillPoint", size: small.size, value: small.amount, price: small.price },
    { type: "cardColor", price: SHOP_CARD_COLOR_PRICE },
    { type: "fortune", price: SHOP_FORTUNE_PRICE },
    { type: "resist", price: SHOP_RESIST_PRICE },
  ].filter((it) => it.price <= 5);
  return { ...pool[Math.floor(Math.random() * pool.length)] };
}
// ---------- ร้านค้าบนแผนที่ (GRID_PLAN §8.1) ----------
// ร้านตั้งอยู่ SHOP_INTERVAL_TURNS เทิร์น แล้วย้ายไปจุดร้านค้าอื่นแบบสุ่ม (ไม่ซ้ำจุดเดิม · ข้ามจุดที่มีคนยืน) พร้อมสุ่มของใหม่
//  ยังไม่มีที่ตั้ง = เริ่มเกม / เพิ่งเปลี่ยนภูมิภาค (placeOnBoard ล้าง shopPos) → ตั้งทันทีตอนต้นเทิร์น
//  ร้านถูกพัง (ท่าไม้ตายเรียวกิ — match.shopRazed) = หายไปจนถึงรอบย้ายตามปกติ
function shopDue() {
  return (!match.shopPos && !match.shopRazed) || Zero.worldRound() - match.shopOpenedRound >= SHOP_INTERVAL_TURNS;
}
function relocateShop() {
  match.shopRazed = false;
  const prev = match.shopPos;
  match.shopPos = Board.pickShopSpot(action.boardMap(), action.boardUnits("*"), prev); // ร้านอยู่ทุกชั้นมิติ = เลี่ยงคนทุกชั้น
  match.shopOpenedRound = Zero.worldRound(); // เวลาโลก (ห่วงเวลาซีโร่ไม่นับ)
  openShop();
}
// ต้นเทิร์น (dealRound): ครบกำหนดย้าย = ย้าย + ของใหม่ · ไม่งั้นแค่คิดผลของภูมิภาคต่อร้านใหม่ตามช่วงเวลา
function maybeMoveShop() {
  if (Colony.active()) { refreshShopForJourney(); return; } // Colony: ร้าน = แคปซูลเสบียง (server/colony.js ตั้ง/เก็บเอง)
  if (shopDue()) relocateShop();
  else refreshShopForJourney();
}
// อีกกี่เทิร์นร้านย้าย (นับเทิร์นนี้ด้วย — 1 = เทิร์นสุดท้ายที่จุดนี้)
function shopTurnsLeft() {
  return match.shopPos ? Math.max(1, match.shopOpenedRound + SHOP_INTERVAL_TURNS - Zero.worldRound()) : 0;
}

// ---------- กระเป๋า 5 ช่อง ----------
//  ขนมปังของเอมิลิโกะ (ของประจำตัว) ไม่กินช่อง
function bagFull(p) {
  return (p.inventory || []).filter((it) => it.type !== "kebread").length >= BAG_SLOTS;
}
// ทิ้งของ: เฉพาะตาตัวเอง · ไม่นับเป็นการใช้ (ยังเดิน/ย้อนได้)
function dropItem(id, uid) {
  const p = match.players[id];
  if (!action.canAct(p)) return false;
  const idx = (p.inventory || []).findIndex((it) => it.uid === uid);
  if (idx < 0) return false;
  if (p.inventory[idx].type === "kebread") return false; // ขนมปังของเอมิลิโกะทิ้งไม่ได้
  const [item] = p.inventory.splice(idx, 1);
  match.lastLog.push(`🗑️ ${p.name} ทิ้ง ${shopItemName(item)}`);
  // ของประจำตัวละคร (ลอว์: หัวใจ = คืนเจ้าของ) — ฮุค onDropItem ของเจ้าของกระเป๋า
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onDropItem) combat.withEffectSource(p, () => combat.runHook(hook, "onDropItem", engine, p, item));
  view.broadcastState();
  return true;
}

// ---------- ให้/แลกของกับเพื่อนร่วมทีม (โหมดร่วมมือ duo/trio/Moon Cell · ผู้ใช้สั่ง 2026-10-27) ----------
//  ตาตัวเอง · ยืนติดเพื่อน (ระยะ 1 · ชั้นมิติเดียวกัน) · ทันที ไม่ต้องรอเพื่อนยืนยัน · ไม่นับเป็นการใช้ (ยังเดิน/ตีได้)
//  ของประจำตัวละคร (ขนมปังเอมิลิโกะ · หัวใจของลอว์) ส่งต่อไม่ได้ · ปืน GUTS มีได้กระบอกเดียว · Mark 42 ผู้รับต้องยังไม่มีชุด
const BOUND_ITEMS = ["kebread", "lawHeart"];
function tradeMate(p, mateId) {
  const m = match.players[mateId];
  if (!p || !m || p.id === m.id || !m.alive || !m.pos || !p.pos || m.summon) return null;
  if (Duo.sideKey(p) === Duo.sideKey(m)) return null; // สองตัวของระบบคู่ใช้กระเป๋าร่วมอยู่แล้ว
  if (!engine.isAlly(p, m) || !Dim.same(p, m)) return null;
  return Board.dist(Board.boxOf(p), Board.boxOf(m)) === 1 ? m : null;
}
const tradable = (it) => !!it && !BOUND_ITEMS.includes(it.type);
// ผู้รับถือของชิ้นนี้ได้ไหม (ไม่นับ without = ชิ้นที่ผู้รับส่งออกไปในการแลก)
function canHold(r, it, without) {
  const bag = (r.inventory || []).filter((x) => x !== without);
  if (it.type === "gutsGun" && bag.some((x) => x.type === "gutsGun")) return false;
  if (it.type === "mark42" && (Mark42.ownsSuit(r) || bag.some((x) => x.type === "mark42"))) return false;
  return true;
}
function tradeReady(id) {
  const p = match.players[id];
  if (!p || !p.alive || p.summon || !action.canAct(p) || asleep(p)) return null;
  return p;
}
function giveItem(id, uid, mateId) {
  const p = tradeReady(id);
  const m = p && tradeMate(p, mateId);
  if (!m) return false;
  const idx = (p.inventory || []).findIndex((it) => it.uid === uid);
  const item = idx >= 0 ? p.inventory[idx] : null;
  if (!tradable(item) || bagFull(m) || !canHold(m, item)) return false;
  p.inventory.splice(idx, 1);
  (m.inventory = m.inventory || []).push(item);
  match.lastLog.push(`🎁 ${p.name} ให้ ${shopItemName(item)} กับ ${m.name}`);
  view.broadcastState();
  return true;
}
function swapItem(id, uid, mateId, theirUid) {
  const p = tradeReady(id);
  const m = p && tradeMate(p, mateId);
  if (!m) return false;
  const mine = (p.inventory || []).find((it) => it.uid === uid);
  const theirs = (m.inventory || []).find((it) => it.uid === theirUid);
  if (!tradable(mine) || !tradable(theirs) || !canHold(m, mine, theirs) || !canHold(p, theirs, mine)) return false;
  p.inventory[p.inventory.indexOf(mine)] = theirs;
  m.inventory[m.inventory.indexOf(theirs)] = mine;
  match.lastLog.push(`🔄 ${p.name} แลก ${shopItemName(mine)} กับ ${shopItemName(theirs)} ของ ${m.name}`);
  view.broadcastState();
  return true;
}

// แจกไอเทมเข้าคลังโดยตรง (ไม่ผ่านร้านค้า/ไม่เสียเหรียญ) — ใช้กับเอฟเฟกต์ตัวละครที่ "ได้รับไอเทม +1 ชิ้น"
//  item = { type, value?, size?, ammo? } รูปแบบเดียวกับของในร้าน — คืน item ที่เข้าคลังจริง · กระเป๋าเต็ม = ไม่ได้ (null)
function grantInventoryItem(p, item) {
  if (!p || !item || !item.type) return null;
  if (bagFull(p)) return null;
  p.inventory = p.inventory || [];
  const entry = { uid: `grant_${item.type}_${p.inventory.length}_${Date.now()}`, type: item.type, value: item.value, size: item.size, ammo: item.ammo, price: item.price || 0 };
  p.inventory.push(entry);
  return entry;
}
// ผู้เล่นมีปืนหน่วย GUTS Select อยู่ในกระเป๋าหรือยัง (มีได้กระบอกเดียว)
function hasGutsGun(p) {
  return (p.inventory || []).some((it) => it.type === "gutsGun");
}
function hasGutsWeapon(p) {
  return hasGutsGun(p);
}
// ซื้อสินค้า: ใครกดก่อนได้ก่อน (Node เป็น single-thread — ประมวลผลทีละ event จึงไม่มี race condition จริง)
// หลับไหล: "ออกการกระทำใดๆ ไม่ได้" — จั่ว/กดสกิลกันไว้ด้วย p.locked อยู่แล้ว
//  แต่ร้านค้า/ไอเทมไม่ได้ผูกกับ p.locked ทั้งหมด (บางชนิดกดใช้นอกเฟสจั่วได้) จึงต้องมีด่านของตัวเอง
function asleep(p) { return !!p && ((p.statuses && p.statuses.sleep) || 0) > 0; }

// เปิดดูร้าน (ตาของตัวเอง · ยืนติดร้าน) = เดินต่อไม่ได้แล้ว แม้ไม่ซื้อ (ผู้ใช้สั่ง 2026-10-24) — ยังตี/ใช้สกิลได้ เหมือนซื้อ
function viewShop(id) {
  const p = match.players[id];
  if (!p || !p.alive || (p.summon && !p.summon.controlled)) return;
  if (!action.canAct(p) || match.action.locked) return;
  if (!p.pos || !Board.nearShop(Board.boxOf(p), match.shopPos)) return;
  action.lockMove(p);
  view.broadcastState();
}
function buyShopItem(id, itemId) {
  const p = match.players[id];
  if (!p || !p.alive || (p.summon && !p.summon.controlled)) return; // ร่างแยกที่คุมได้ซื้อให้เจ้าของได้ (เหรียญ/กระเป๋าใช้ร่วม — ผู้ใช้สั่ง 2026-10-21) · ตัวเหมือนซื้อไม่ได้
  if (!action.canAct(p)) return; // ซื้อได้เฉพาะตาเดินของตัวเอง
  if (asleep(p)) return; // หลับไหล: ซื้อของไม่ได้
  if (!p.pos || !Board.nearShop(Board.boxOf(p), match.shopPos)) return; // ต้องยืนติดร้าน (ระยะ 1) — GRID_PLAN §8.1
  if (bagFull(p)) return; // กระเป๋าเต็ม
  const item = match.shopItems.find((it) => it.id === itemId);
  if (!item || item.sold) return;
  if ((p.gold || 0) < item.price) return;
  p.inventory = p.inventory || [];
  if (item.type === "gutsGun" && hasGutsGun(p)) return;
  if (item.type === "mark42" && !Mark42.canBuy(engine, p)) return; // มีชุดอยู่แล้ว / ชุดเพิ่งพังจากการต่อสู้ (10 เทิร์น)
  item.bought = (item.bought || 0) + 1; // ทุ่งดอกไม้ กลางคืน: ช่องละหลายชิ้น (refreshShopForJourney คิด sold/stock ใหม่)
  item.soldTo = p.id;
  refreshShopForJourney();
  p.gold -= item.price;
  action.lockMove(p); // ซื้อแล้วเดินไม่ได้อีก (ยังตีได้)
  p.inventory.push({ uid: `${item.id}_${p.inventory.length}_${Date.now()}`, type: item.type, value: item.value, size: item.size, ammo: item.ammo, price: item.price });
  match.lastLog.push(`🛍️ ${p.name} ซื้อ ${shopItemName(item)} จากร้านค้ามายา (-${item.price} เหรียญ)`);
  view.broadcastState();
}
// ใช้ของในคลัง
function cardLabel(c) {
  if (!c) return "?";
  if (c.special) return { king: "ราชา", queen: "ราชินี", joker: "โจ๊กเกอร์" }[c.special] || c.special;
  return String(c.value);
}
function useInventoryItem(id, uid, opts = {}) {
  const p = match.players[id];
  if (!p || !p.alive || p.summon) return; // ยูนิตที่ถูกเรียก (ร่างแยก) ใช้ไอเทมไม่ได้
  if (!action.canAct(p)) return; // ใช้ของได้เฉพาะตาเดินของตัวเอง — ใช้แล้วเดินไม่ได้อีก (GRID_PLAN §8.1)
  if (asleep(p)) return; // หลับไหล: ใช้ไอเทมไม่ได้เลย (ยาโชคลาภ/ต้านสถานะ/แต้มสกิล/เกราะ เดิมไม่เช็ค p.locked จึงรั่ว)
  const idx = (p.inventory || []).findIndex((it) => it.uid === uid);
  if (idx < 0) return;
  const item = p.inventory[idx];
  // ---------- เกราะ Mark 42 (characters/_mark42.js): ใส่เอง / ใส่ให้คนอื่น / ใส่ให้คนอื่นแล้วระเบิด (ต้องยืนติดกัน) ----------
  if (item.type === "mark42") {
    const other = opts.targetId && opts.targetId !== p.id ? match.players[opts.targetId] : null;
    if (other && Visibility.hiddenFromUnit(p, other)) return; // มองไม่เห็น = ส่งชุดให้ไม่ได้
    if (other && !Dim.same(p, other)) return; // ชั้นมิติ (server/dimension.js): คนละชั้นส่งชุดให้ไม่ได้
    const plan = Mark42.planUse(engine, p, item, opts.mode, opts.targetId);
    if (!plan) return;
    action.lockMove(p);
    if (other) Visibility.onHostileAct(p, "item"); // ใช้ไอเทมใส่คนอื่น = โผล่จากพุ่ม · นักบินปริศนาปรากฏตัว
    p.inventory.splice(idx, 1);
    characterRules.mark42Run(p, plan, null);
    return;
  }
  // ---------- ขนมปัง (ของประจำตัวเอมิลิโกะ · characters/kate_emiliko_combat.js): กินเอง / ป้อนเคทที่ยืนติดกัน ----------
  if (item.type === "kebread") {
    const hook = CHAR_HOOKS[p.characterId];
    if (!hook || !hook.useBread || !hook.useBread(engine, p, item, opts)) return;
    action.lockStrike(p); // กินเอง/ป้อนเคท = เอมิลิโกะเดินต่อและตีปกติไม่ได้ในตานี้ (ผู้ใช้สั่ง 2026-10-14)
    if (!(item.uses > 0)) p.inventory.splice(p.inventory.indexOf(item), 1);
    view.broadcastState();
    return;
  }
  // ---------- หัวใจ (ท่าไม้ตาย Mess ของลอว์ · characters/trafalgar_law.js): บีบ = ความเสียหายใส่เจ้าของหัวใจ ไม่ว่าอยู่ไกลแค่ไหน ----------
  //  ฮุค canUseCharItem(engine, p, item) ด่านก่อน → ใช้แล้วเดินไม่ได้อีก → useCharItem(engine, p, item, opts) ลงผล (หักครั้ง/เอาออกจากกระเป๋า/พักฉากเอง)
  if (item.type === "lawHeart") {
    const hook = CHAR_HOOKS[p.characterId];
    if (!hook || !hook.useCharItem || (hook.canUseCharItem && !hook.canUseCharItem(engine, p, item))) return;
    action.lockMove(p);
    hook.useCharItem(engine, p, item, opts);
    return;
  }
  // ---------- ปืน GUTS: นับเป็นการโจมตีของตา (จบตา) ----------
  if (item.type === "gutsAmmo") {
    fireGuts(p, idx, item, opts.targetId);
    return;
  }
  if (item.type === "resist") {
    p.statuses.resist = Math.max(p.statuses.resist || 0, SHOP_RESIST_TURNS);
    match.lastLog.push(`🛡️ ${p.name} ใช้ยาต้านสถานะ — ต้านสถานะผิดปกติ ${SHOP_RESIST_TURNS} เทิร์น จากคลัง`);
  } else if (item.type === "skillPoint") {
    if (combat.skillGainBlocked(p, "item")) return; // ฮุค blocksSkillGain (ชิโร่/เฟิร์น): ยาไม่มีผล = ใช้ไม่ได้ ไม่เสียของ
    combat.addSkill(p, item.value, "item");
    match.lastLog.push(`⚡ ${p.name} ใช้ยาฟื้นแต้มสกิล +${item.value} จากคลัง (เพดาน ${combat.maxSkillOf(p)})`);
  } else if (item.type === "armor") {
    const healed = combat.healArmor(p, item.value);
    match.lastLog.push(`🔧 ${p.name} ใช้ยาฟื้นเกราะ +${healed} จากคลัง`);
  } else if (item.type === "gutsGun") {
    return; // ปืนเป็นไอเทมถาวร ไม่ใช่ของกดใช้ — ต้อง return ก่อนถึง splice ท้ายฟังก์ชัน ไม่งั้นปืนหายทันทีที่กด
  } else {
    return;
  }
  action.lockMove(p);
  p.inventory.splice(idx, 1);
  view.broadcastState();
}
// ---------- ไอเทมช่วงจั่วไพ่ (ผู้ใช้สั่ง 2026-10-18) ----------
//  ยาโชคลาภ / ยาเปลี่ยนสีการ์ด ใช้ได้เฉพาะช่วงจั่วไพ่ ก่อนกด "พอ" — ใช้จากกล่องข้างปุ่มจั่ว (ตาเดินกดใช้ไม่ได้)
//  ไม่ล็อกการเดิน · ระบบคู่: เจ้าของถือไพ่/กระเป๋า (กระเป๋าใช้ร่วมกัน — server/duo.js SHARED)
const CARD_COLOR_NAME = { red: "สีแดง", blue: "สีฟ้า", green: "สีเขียว", yellow: "สีเหลือง" };
function useDrawItem(id, uid, opts = {}) {
  const p = match.players[id];
  if (match.gameState !== "PLAYING" || !p || !Duo.inGame(p) || p.locked) return; // ติดสตั้น/หลับไหล = ล็อกอยู่แล้ว
  const idx = (p.inventory || []).findIndex((it) => it.uid === uid);
  if (idx < 0) return;
  const item = p.inventory[idx];
  if (item.type === "fortune") {
    if ((p.statuses.fortune || 0) >= FORTUNE_MAX) return; // เต็มเพดานแล้ว ไม่เสียของ
    p.statuses.fortune = Math.min(FORTUNE_MAX, (p.statuses.fortune || 0) + SHOP_FORTUNE_AMOUNT);
    match.lastLog.push(`🍀 ${p.name} ใช้ยาโชคลาภ — ได้โชคลาภ +${SHOP_FORTUNE_AMOUNT}`);
  } else if (item.type === "cardColor") {
    const cardIndex = Number(opts.cardIndex);
    const target = Number.isInteger(cardIndex) ? (p.cards || [])[cardIndex] : null;
    // ต้องเป็นการ์ดเลข (ไม่ใช่การ์ดพิเศษ) + สีที่ถูกต้อง + ไม่ใช่สีเดิม
    if (!target || target.special || !cardDeck.CARD_COLORS.includes(opts.color) || target.color === opts.color) return;
    const oldColor = target.color;
    target.color = opts.color;
    cardDeck.checkBlueTrigger(p); // เผื่อเปลี่ยนแล้วครบฟ้า 3 ใบพอดี
    match.lastLog.push(`🎨 ${p.name} ใช้ยาเปลี่ยนสีการ์ด — ไพ่ ${cardLabel(target)} จาก${CARD_COLOR_NAME[oldColor]}เป็น${CARD_COLOR_NAME[opts.color]}`);
  } else {
    return;
  }
  p.inventory.splice(idx, 1);
  view.broadcastState();
}
// ยิงปืน GUTS (GRID_PLAN §6/§8.1): นับเป็นการโจมตีของตา — ย้อนการเดินไม่ได้แล้ว และจบตาหลังฉากยิง
//  ลำดับ: วีดีโอกระสุน (ครั้งแรกต่อคน) → ผลของกระสุน → ฉากยิง (ATTACKING) ที่มีตีสวนถ้าผู้ยิงอยู่ในระยะตีของเป้า → คนถัดไป
function fireGuts(p, idx, item, targetId) {
  const target = gutsFireTargetOf(p, item, targetId);
  if (!target) return false; // ยิงไม่ได้ = ไม่เสียกระสุน
  timers.clearPhaseTimer();
  match.action.locked = true;
  p.gutsShotTurn = match.roundNumber;
  p.inventory.splice(idx, 1);
  Visibility.onHostileAct(p, "gun"); // ยิงจากในพุ่ม = โผล่จนจบเทิร์น · นักบินปริศนาปรากฏตัว
  match.lastLog.push(`🔫 ${p.name} ยิง ${GUTS_AMMO[item.ammo].name} ใส่ ${target.name}!`);
  // วีดีโอเต็มจอของกระสุนแต่ละแบบเล่นครั้งเดียวต่อเกม "ต่อผู้ยิงแต่ละคน" (เก็บใน p.cutsceneShown เหมือน
  //  วีดีโอแปลงร่างของตัวละคร — รีเซ็ตทุกแมตช์ใหม่ใน resetCombat) ครั้งต่อไปเป็นการ์ดแจ้งเตือนเล็ก ไม่หยุดกระดาน
  const key = GUTS_AMMO[item.ammo].cut;
  if (p.cutsceneShown[key]) cutscene.notifyTransform(p, key);
  else { p.cutsceneShown[key] = true; cutscene.queueCutscene(p, key); }
  // ห่อ withEffectSource ซ้ำ: คอลแบ็กทำงาน "หลังวีดีโอจบ" ซึ่งหลุดขอบเขต effectSourceId ของ onPlayerEvent ไปแล้ว
  //  — ไม่ห่อ = friendly-fire check ไม่รู้ว่าใครยิง
  cutscene.runCutsceneQueue(() => combat.withEffectSource(p, () => {
    applyGutsBullet(p, item, target);
    attack.gunAttack(p, target, item.ammo, action.finishActor);
  }));
  return true;
}
// ตรวจว่ายิงได้ไหม + คืนเป้าหมายที่ถูกต้อง (null = ยิงไม่ได้)
//  ตาเดินของตัวเอง / ต้องมีปืน / 1 นัดต่อเทิร์น / เป้าเป็นศัตรูที่ยังอยู่ และห่างอยู่ในระยะ GUTS_RANGE
function gutsFireTargetOf(p, item, targetId) {
  if (!action.canAct(p) || p.summon) return null; // ยูนิตที่ถูกเรียก (ร่างแยก) ยิงไม่ได้
  if (!hasGutsWeapon(p)) return null;
  if (p.gutsShotTurn === match.roundNumber) return null;
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.blocksGuts && hook.blocksGuts(engine, p)) return null; // เกรย์: ชาร์จรองโกมิเนียตอยู่
  if (!GUTS_AMMO[item.ammo]) return null;
  const target = match.players[targetId];
  if (!target || !target.alive || target.id === p.id || combat.sameTeam(p, target)) return null;
  if (Visibility.hiddenFromUnit(p, target)) return null; // มองไม่เห็น = เล็งไม่ได้
  if (!Dim.same(p, target)) return null; // ชั้นมิติ (server/dimension.js): คนละชั้นเล็งไม่ได้
  if (!p.pos || !target.pos || !Board.inRange(GUTS_RANGE, Board.dist(Board.boxOf(p), Board.boxOf(target)))) return null;
  return target;
}
// ให้ผลของกระสุน — เรียกหลังวีดีโอจบเท่านั้น (ดู pausePlayingForCutscene)
function applyGutsBullet(p, item, target) {
  // Nursedessei Cannon: ยิงเสร็จปืนพัง หายจากกระเป๋า ต้องซื้อใหม่ (พังแม้เป้าหมายจะตกรอบไปก่อนแล้ว)
  if (GUTS_AMMO[item.ammo].breaksGun) {
    const gunIdx = (p.inventory || []).findIndex((it) => it.type === "gutsGun");
    if (gunIdx >= 0) p.inventory.splice(gunIdx, 1);
  }
  if (!target || !target.alive) { // เป้าหมายตกรอบระหว่างวีดีโอเล่น — กระสุนสูญเปล่า
    match.lastLog.push(`💨 ${GUTS_AMMO[item.ammo].name} พลาดเป้า — ${target ? target.name : "เป้าหมาย"} ตกรอบไปก่อนแล้ว`);
    return;
  }
  if (item.ammo === "shockwave") {
    const before = target.armor;
    if (Mark42.suited(target)) Mark42.breakSuit(engine, target, "combat"); // เกราะ Mark 42: สลายเกราะ = ชุดพัง
    else for (let i = 0; i < before; i++) { if (target.armor > 0) combat.loseArmor(target); }
    match.lastLog.push(before > 0
      ? `💥 Shockwave Bullet — เกราะของ ${target.name} ถูกทำลายทั้งหมด (-${before}) แต่พลังชีวิตจริงไม่ได้รับความเสียหาย`
      : `💨 Shockwave Bullet — ${target.name} ไม่มีเกราะให้ทำลาย กระสุนสูญเปล่า`);
  } else if (item.ammo === "gargorgon") {
    target.gutsGargorgonPending = true;
    match.lastLog.push(`🌑 Gargorgon Ray — ${target.name} จะติดสถานะสตั้นในเทิร์นถัดไป (ต้านทานได้)`);
  } else if (item.ammo === "thunder") {
    if (combat.applyDebuff(target, "chaa", null, GUTS_CHAA_TURNS)) match.lastLog.push(`⚡ Thunder Bullet — ${target.name} ติดสถานะ [สภาพชา] ${GUTS_CHAA_TURNS} เทิร์น (กดจั่ว 1 ครั้งได้ไพ่ 2 ใบ)`);
    else match.lastLog.push(`🛡️ Thunder Bullet — ${target.name} ต้านสถานะผิดปกติไว้ได้ ไม่ติด [สภาพชา]`);
  } else if (item.ammo === "nurse") {
    combat.dealMixed(target, GUTS_NURSE_DMG);
    match.lastLog.push(`☄️ Nursedessei Cannon — ${target.name} เสียหาย -${GUTS_NURSE_DMG} (ลดเกราะก่อน) และปืนของ ${p.name} พังหายไป!`);
    if (target.alive && target.hp <= 0) {
      combat.instantDeath(target);
      if (!target.alive) match.lastLog.push(`💀 ${target.name} เลือดจริงหมด ตกรอบ!`);
    }
  }
}

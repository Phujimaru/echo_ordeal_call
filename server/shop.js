// เหรียญ + ร้านค้ามายา + ไอเทม
// export ก่อน require: ไฟล์ใน server/ require วนกันเอง — function declaration ถูก hoist จึงพร้อมใช้ตั้งแต่บรรทัดแรก
Object.assign(module.exports, {
  goldCapOf, addGold, shopCatalog, shopItemName, openShop, openShopAt, refreshShopForJourney, journeyGiftItem,
  shopDue, relocateShop, maybeMoveShop, shopTurnsLeft, shopTurnsLeftOf, bagFull, dropItem,
  shopAt, shopTiles, shopById, razeShopsIn, capsule, capsules, placeCapsule, clearCapsule, clearShops, publicShops, nearShopOf, tickMerchant,
  giveItem, swapItem,
  grantInventoryItem, asleep, viewShop, buyShopItem,
  cardLabel, useInventoryItem, useDrawItem, chargeBatteries, cleansableOf,
});

const CHAR_HOOKS = require("../characters/index");
const Journey = require("../characters/_journey");
const {
  BAG_SLOTS, BATTERY_MAX, BATTERY_REGEN, FORTUNE_MAX, GOLD_MAX, SHOP_ARMOR_AMOUNT, SHOP_ARMOR_PRICE, SHOP_BATTERY_PRICE,
  SHOP_CARD_COLOR_PRICE, SHOP_CARD_CUT_PRICE, SHOP_CLEANSE_PRICE, SHOP_FORTUNE_AMOUNT, SHOP_FORTUNE_PRICE, SHOP_INTERVAL_TURNS,
  SHOP_RESIST_PRICE, SHOP_RESIST_TURNS, SHOP_STOCK_MAX, SHOP_STOCK_MIN, SHOP_TORCH_PRICE,
  SHOP_LIFE_CRYSTAL_PRICE, SHOP_ARMOR_CRYSTAL_PRICE, SHOP_WIND_BOOTS_PRICE, WIND_BOOTS_MOV,
} = require("./constants");
const { BASIC_DEBUFF_CLEAR, SOFT_DEBUFF_STEP } = require("../characters/_universal_status");
const Board = require("./board");
const cardDeck = require("./deck");
const Duo = require("./duo");
const match = require("./match");
const { engine } = require("./engine");
const action = require("./phases/action");
const combat = require("./combat");
const view = require("./view");
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

// ---------- ร้านค้า 3 ร้าน (ผู้ใช้สั่ง 2026-11-08 · แผน .claude/plans/shop-three.md) ----------
//  match.shops = [{ id, kind, x, y, size, items, openedRound, leaves, razed }]
//   apoth = ร้านยาเจริญชัย · forge = โรงช่างลุงเริง — ปรากฏพร้อมกันทุก SHOP_INTERVAL_TURNS เทิร์น คนละจุด (2×2)
//   cara = พ่อค้าเร่ — สุ่มโผล่ MERCHANT_PCT% ต่อเทิร์น อยู่ MERCHANT_TURNS เทิร์น · ของหายาก ช่องละ MERCHANT_STOCK ชิ้น
//   Colony: ร้านทั้ง 3 มาเป็น "แคปซูลเสบียง" 1×1 ตกจากแกนกลาง (ผู้ใช้สั่ง 2026-11-09) — kind เดิม (apoth/forge/cara) + capsule: true ·
//     server/colony.js วาง/เก็บผ่าน placeCapsule(kind, …)/clearCapsule(kind) · ชนิด "capsule" (ขายทุกอย่าง) ยังรองรับสำหรับเซฟเก่า
//  ทุกร้านกินช่องทั้งก้อน (size×size) · ซื้อได้เมื่อยืนติดขอบร้าน (ระยะ 1) · ร้านถูกพัง = หายจนถึงรอบปรากฏถัดไปของร้านนั้น
//  ของในร้าน: ชนิดละช่องเดียว ไม่ซ้ำ · สุ่มจำนวนที่ซื้อได้ต่อช่อง (ของกลาง ใครถึงก่อนได้ก่อน)
const SHOP_NAMES = { apoth: "ร้านยาเจริญชัย", forge: "โรงช่างลุงเริง", cara: "พ่อค้าเร่", capsule: "แคปซูลเสบียง" };
const SHOP_ITEMS = {
  apoth: ["fortune", "cardColor", "cardCut", "armor", "cleanse", "resist"],
  forge: ["windBoots", "battery"],
  cara: ["lifeCrystal", "armorCrystal"],
};
const SHOP_SIZE = 2;
const MERCHANT_PCT = 25;
const MERCHANT_TURNS = 2;
const MERCHANT_STOCK = [1, 2];
function shopCatalog(kind) {
  const all = [
    { type: "fortune", price: SHOP_FORTUNE_PRICE },
    { type: "cardColor", price: SHOP_CARD_COLOR_PRICE },
    { type: "cardCut", price: SHOP_CARD_CUT_PRICE },
    { type: "armor", value: SHOP_ARMOR_AMOUNT, price: SHOP_ARMOR_PRICE },
    { type: "cleanse", price: SHOP_CLEANSE_PRICE },
    { type: "resist", price: SHOP_RESIST_PRICE },
    { type: "windBoots", price: SHOP_WIND_BOOTS_PRICE },
    { type: "battery", price: SHOP_BATTERY_PRICE },
    { type: "lifeCrystal", price: SHOP_LIFE_CRYSTAL_PRICE },
    { type: "armorCrystal", price: SHOP_ARMOR_CRYSTAL_PRICE },
  ];
  return SHOP_ITEMS[kind] ? all.filter((it) => SHOP_ITEMS[kind].includes(it.type)) : all; // capsule / ไม่ระบุ = ทุกอย่าง
}
const rollRange = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));
const rollStock = (kind) => rollRange(kind === "cara" ? MERCHANT_STOCK : [SHOP_STOCK_MIN, SHOP_STOCK_MAX]);
function shopItemName(item) {
  if (item.type === "cardColor") return "ยาเปลี่ยนสีการ์ด";
  if (item.type === "fortune") return "ยาโชคลาภ";
  if (item.type === "resist") return "ยาต้านสถานะ";
  if (item.type === "cardCut") return "กรรไกรตัดไพ่";
  if (item.type === "cleanse") return "ยาล้างสถานะ";
  if (item.type === "battery") return "วงจรพลังงาน";
  if (item.type === "lifeCrystal") return "ผลึกชีวิต";
  if (item.type === "armorCrystal") return "ผลึกเกราะ";
  if (item.type === "windBoots") return "รองเท้าวายุ";
  if (item.type === "armor") return `ยาฟื้นเกราะ +${item.value}`;
  if (item.type === "kebread") return "ขนมปัง";
  if (item.type === "giornoArrow") return "ธนู Requiem";
  if (item.type === "lawHeart") return `หัวใจของ ${item.targetName || "?"}`;
  if (item.type === "torch") return "คบเพลิง";
  return "สินค้า";
}
function shopsList() { return match.shops || (match.shops = []); }
function shopById(id) { return shopsList().find((s) => s.id === id) || null; }
// ร้านที่ครอบช่อง (x, y) อยู่ (หรือ null)
function shopAt(x, y) {
  return shopsList().find((s) => x >= s.x && x < s.x + (s.size || 1) && y >= s.y && y < s.y + (s.size || 1)) || null;
}
// ทุกช่องที่ร้านกินอยู่ (Set ของ key "x,y")
function shopTiles() {
  const out = new Set();
  for (const s of shopsList()) for (let dx = 0; dx < (s.size || 1); dx++) for (let dy = 0; dy < (s.size || 1); dy++) out.add(Board.key(s.x + dx, s.y + dy));
  return out;
}
function shopBox(s) { return { x: s.x, y: s.y, size: s.size || 1 }; }
// สร้างของในร้าน (ชนิดละช่อง · สุ่มจำนวน)
function stockShop(s) {
  match.shopRoundSeq = (match.shopRoundSeq || 0) + 1;
  s.items = shopCatalog(s.kind).map((it, i) => ({ id: `${s.id}_${match.shopRoundSeq}_${i}`, ...it, stockBase: rollStock(s.kind), bought: 0, sold: false, soldTo: null }));
}
// เปิดร้าน kind ที่จุด (x, y) — แทนร้าน kind เดิม (ถ้ามี)
function openShopAt(kind, x, y, size = SHOP_SIZE, extra = {}) {
  match.shops = shopsList().filter((s) => s.kind !== kind);
  const s = { id: kind, kind, x, y, size, items: [], openedRound: Zero.worldRound(), razed: false, ...extra };
  stockShop(s);
  match.shops.push(s);
  refreshShopForJourney();
  match.lastLog.push(`🏪 ${SHOP_NAMES[kind] || "ร้านค้า"} · ปรากฏ`);
  return s;
}
// เข้ากันได้กับโค้ด/เทสต์เดิม: เปิดร้านยาเจริญชัยใหม่ที่จุดเดิม (หรือจุดแรกของแผนที่)
function openShop() {
  const cur = shopById("apoth");
  if (cur) { stockShop(cur); refreshShopForJourney(); return cur; }
  const spot = pickSpots(1)[0] || { x: 0, y: 0 };
  return openShopAt("apoth", spot.x, spot.y);
}
// คิดจำนวนที่ยังซื้อได้ของทุกช่องใหม่ "ทุกต้นเทิร์น" (เรียกจาก dealRound + ตอนร้านเปิด + หลังซื้อ) — ผลของภูมิภาคเปลี่ยนตามช่วงเวลา
//  · stockMax = stockBase + โบนัสภูมิภาค (ทุ่งดอกไม้ กลางคืน +2) · stock = ที่เหลือ · sold = หมด/ปิดขาย (client ใช้ตัดสินปุ่มซื้อ)
//  · closed = ปิดขายชั่วคราว (คลื่นวงวนน้ำ กลางวัน: ของราคาต่ำกว่า 5)
function refreshShopForJourney() {
  syncStageItems();
  for (const s of shopsList()) for (const it of s.items || []) {
    if (it.type === "torch") { it.sold = false; continue; } // คบเพลิง (Fodlan ด่าน II): ซื้อได้ไม่จำกัด
    if (it.bought == null) it.bought = it.sold ? 1 : 0;
    if (it.stockBase == null) it.stockBase = 1;
    const limit = it.stockBase + Journey.shopStockBonus(engine);
    it.stockMax = limit;
    it.stock = Math.max(0, limit - it.bought);
    it.closed = Journey.shopClosed(engine, it);
    it.sold = it.closed || it.stock <= 0;
  }
}
// Fodlan ด่าน II เรเมียร์ (server/fodlan/stage2.js): คบเพลิงขายที่ร้านยาเจริญชัยเฉพาะตอนอยู่ด่านนี้ · ออกจากด่าน = เอาออก
function syncStageItems() {
  const want = require("./fodlan/stage2").torchOnSale();
  for (const s of shopsList()) {
    if (s.kind !== "apoth" && s.kind !== "capsule") continue;
    const has = (s.items || []).some((it) => it.type === "torch");
    if (want && !has) s.items.push({ id: `${s.id}_torch_${match.shopRoundSeq}`, type: "torch", price: SHOP_TORCH_PRICE, sold: false, soldTo: null, bought: 0 });
    else if (!want && has) s.items = s.items.filter((it) => it.type !== "torch");
  }
}
// การเดินทาง (ทุ่งดอกไม้ กลางวัน): ของฟรีราคาไม่เกิน 5 ที่ใช้ได้ทันที
function journeyGiftItem() {
  const pool = [
    { type: "armor", value: SHOP_ARMOR_AMOUNT, price: SHOP_ARMOR_PRICE },
    { type: "cleanse", price: SHOP_CLEANSE_PRICE },
    { type: "cardCut", price: SHOP_CARD_CUT_PRICE },
    { type: "cardColor", price: SHOP_CARD_COLOR_PRICE },
    { type: "fortune", price: SHOP_FORTUNE_PRICE },
    { type: "resist", price: SHOP_RESIST_PRICE },
  ].filter((it) => it.price <= 5);
  return { ...pool[Math.floor(Math.random() * pool.length)] };
}
// ---------- ที่ตั้งร้านบนแผนที่ (GRID_PLAN §8.1 · 2×2) ----------
//  จุดร้านค้า (map.shopSpots) = มุมบนซ้ายของร้าน 2×2 · ใช้ได้เมื่อ 4 ช่องอยู่ในกระดาน ไม่มี terrain ไม่มีคนยืน (ทุกชั้นมิติ)
//  ไม่ทับร้านอื่น (เว้นห่างอย่างน้อย 1 ช่อง) · avoid = จุดเดิมของร้านนั้น (ไม่ซ้ำจุดเดิม)
function spotFree(map, units, x, y, size, others) {
  for (let dx = 0; dx < size; dx++) for (let dy = 0; dy < size; dy++) {
    const tx = x + dx, ty = y + dy;
    if (tx < 0 || ty < 0 || tx >= map.cols || ty >= map.rows) return false;
    if (map.terrain[Board.key(tx, ty)]) return false;
    if (units.some((u) => u.pos && Board.dist(Board.boxOf(u), { x: tx, y: ty, size: 1 }) === 0)) return false;
  }
  return others.every((o) => Board.dist({ x, y, size }, shopBox(o)) >= 2);
}
function pickSpots(n, keep = [], avoid = [], size = SHOP_SIZE) {
  const map = action.boardMap();
  const units = Object.values(match.players).filter((p) => p.alive && p.pos);
  const out = [];
  const pool = (map.shopSpots || []).slice().sort(() => Math.random() - 0.5);
  for (const pass of [0, 1]) for (const s of pool) {
    if (out.length >= n) break;
    if (pass === 0 && avoid.some((a) => a && a.x === s.x && a.y === s.y)) continue; // รอบแรกเลี่ยงจุดเดิม · ไม่พอค่อยยอมใช้
    if (out.some((o) => o.x === s.x && o.y === s.y)) continue;
    if (spotFree(map, units, s.x, s.y, size, [...keep, ...out.map((o) => ({ ...o, size }))])) out.push({ x: s.x, y: s.y });
  }
  // จุดตั้งร้านของแผนที่ไม่พอ (เช่น ชั้นของด่านทับ) = หาช่องว่างขนาดร้านจากทั้งแผนที่ (ห่างจุดเกิดของผู้เล่นอย่างน้อย 2)
  if (out.length < n) {
    const cells = [];
    for (let y = 1; y < map.rows - size; y++) for (let x = 1; x < map.cols - size; x++) cells.push({ x, y });
    cells.sort(() => Math.random() - 0.5);
    for (const c of cells) {
      if (out.length >= n) break;
      if (units.some((u) => Board.dist(Board.boxOf(u), { x: c.x, y: c.y, size }) < 2)) continue;
      if (spotFree(map, units, c.x, c.y, size, [...keep, ...out.map((o) => ({ ...o, size }))])) out.push(c);
    }
  }
  return out;
}
// ร้านยา + โรงช่าง: ปรากฏจุดใหม่พร้อมกัน (ต้นเกม / ครบ 6 เทิร์น / เปลี่ยนภูมิภาค)
function relocateShop() {
  const prev = shopsList().filter((s) => s.kind === "apoth" || s.kind === "forge").map((s) => ({ x: s.x, y: s.y }));
  const keep = shopsList().filter((s) => s.kind === "cara");
  match.shops = keep;
  match.shopCycleRound = Zero.worldRound(); // เวลาโลก (ห่วงเวลาซีโร่ไม่นับ)
  const spots = pickSpots(2, keep, prev);
  if (spots[0]) openShopAt("apoth", spots[0].x, spots[0].y);
  if (spots[1]) openShopAt("forge", spots[1].x, spots[1].y);
}
function shopDue() {
  return match.shopCycleRound == null || Zero.worldRound() - match.shopCycleRound >= SHOP_INTERVAL_TURNS;
}
// พ่อค้าเร่: หมดเวลา = จากไป · ไม่มีอยู่ = สุ่มโผล่
function tickMerchant() {
  const now = Zero.worldRound();
  const cur = shopById("cara");
  if (cur && now >= cur.leaves) { match.shops = shopsList().filter((s) => s !== cur); match.lastLog.push("🐎 พ่อค้าเร่จากไปแล้ว"); }
  if (shopById("cara") || Math.random() * 100 >= MERCHANT_PCT) return;
  const spot = pickSpots(1, shopsList())[0];
  if (spot) openShopAt("cara", spot.x, spot.y, SHOP_SIZE, { leaves: now + MERCHANT_TURNS });
}
// ต้นเทิร์น (dealRound): ครบกำหนด = ร้านยา/โรงช่างปรากฏจุดใหม่ + ของใหม่ · พ่อค้าเร่สุ่มโผล่/จากไป · คิดผลของภูมิภาคใหม่
function maybeMoveShop() {
  if (Colony.active()) { refreshShopForJourney(); return; } // Colony: ร้าน = แคปซูลเสบียง (server/colony.js ตั้ง/เก็บเอง)
  if (shopDue()) relocateShop();
  tickMerchant();
  refreshShopForJourney();
}
// อีกกี่เทิร์นร้านนี้อยู่ (นับเทิร์นนี้ด้วย — 1 = เทิร์นสุดท้าย)
function shopTurnsLeftOf(s) {
  if (!s) return 0;
  const now = Zero.worldRound();
  if (s.capsule || s.kind === "capsule") return Math.max(1, (s.openedRound || now) + (s.kind === "cara" ? 2 : SHOP_INTERVAL_TURNS) - now);
  if (s.kind === "cara") return Math.max(1, (s.leaves || now) - now);
  return Math.max(1, (match.shopCycleRound || now) + SHOP_INTERVAL_TURNS - now);
}
function shopTurnsLeft() { return shopTurnsLeftOf(shopById("apoth") || shopsList()[0]); }
// ร้านถูกพัง (ท่าไม้ตายเรียวกิ/อรชุน): ร้านที่ครอบช่องในพื้นที่หายไป (จนถึงรอบปรากฏถัดไป) — คืนร้านที่พัง
function razeShopsIn(keys) {
  const hit = shopsList().filter((s) => { for (let dx = 0; dx < (s.size || 1); dx++) for (let dy = 0; dy < (s.size || 1); dy++) if (keys.has(Board.key(s.x + dx, s.y + dy))) return true; return false; });
  if (hit.length) match.shops = shopsList().filter((s) => !hit.includes(s));
  return hit;
}
// Colony: แคปซูลเสบียง 1×1
function capsules() { return shopsList().filter((s) => s.capsule || s.kind === "capsule"); }
function capsule() { return capsules()[0] || null; }
// วางแคปซูลชนิด kind (apoth | forge | cara) — แทนแคปซูลชนิดเดียวกันที่มีอยู่ · final = แคปซูลสุดท้าย (ของแพงกว่า ×1.5)
function placeCapsule(kind, x, y, final) {
  if (typeof kind === "number") { final = y; y = x; x = kind; kind = "apoth"; } // ลายเซ็นเดิม placeCapsule(x, y, final)
  const s = openShopAt(kind, x, y, 1, { openedRound: match.roundNumber + 1, capsule: true, final: !!final });
  if (final) for (const it of s.items) it.price = Math.ceil(it.price * 1.5);
  return s;
}
// เก็บแคปซูล (kind = ชนิดเดียว · ไม่ระบุ = ทุกแคปซูล)
function clearCapsule(kind) { match.shops = shopsList().filter((s) => !((s.capsule || s.kind === "capsule") && (!kind || s.kind === kind))); }
function clearShops() { match.shops = []; match.shopCycleRound = null; }
// สถานะที่ส่งให้ client (view.js)
function publicShops() {
  return shopsList().map((s) => ({ id: s.id, kind: s.kind, name: SHOP_NAMES[s.kind] || "ร้านค้า", x: s.x, y: s.y, size: s.size || 1, turnsLeft: shopTurnsLeftOf(s), items: s.items || [], ...(s.capsule ? { capsule: true } : {}) }));
}
// ผู้เล่นยืนติดร้านนี้ไหม (ตัวใหญ่นับจากขอบตัว)
function nearShopOf(p, s) { return !!p && !!p.pos && !!s && Board.dist(Board.boxOf(p), shopBox(s)) === 1; }

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
  if (p.inventory[idx].type === "kebread" || p.inventory[idx].type === "giornoArrow") return false; // ขนมปังของเอมิลิโกะ/ธนู Requiem ทิ้งไม่ได้
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
//  ของประจำตัวละคร (ขนมปังเอมิลิโกะ · หัวใจของลอว์ · ธนู Requiem) ส่งต่อไม่ได้
const BOUND_ITEMS = ["kebread", "lawHeart", "giornoArrow"];
function tradeMate(p, mateId) {
  const m = match.players[mateId];
  if (!p || !m || p.id === m.id || !m.alive || !m.pos || !p.pos || m.summon) return null;
  if (Duo.sideKey(p) === Duo.sideKey(m)) return null; // สองตัวของระบบคู่ใช้กระเป๋าร่วมอยู่แล้ว
  if (!engine.isAlly(p, m) || !Dim.same(p, m)) return null;
  return Board.dist(Board.boxOf(p), Board.boxOf(m)) === 1 ? m : null;
}
const tradable = (it) => !!it && !BOUND_ITEMS.includes(it.type);
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
  if (!tradable(item) || bagFull(m)) return false;
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
  if (!tradable(mine) || !tradable(theirs)) return false;
  p.inventory[p.inventory.indexOf(mine)] = theirs;
  m.inventory[m.inventory.indexOf(theirs)] = mine;
  match.lastLog.push(`🔄 ${p.name} แลก ${shopItemName(mine)} กับ ${shopItemName(theirs)} ของ ${m.name}`);
  view.broadcastState();
  return true;
}

// แจกไอเทมเข้าคลังโดยตรง (ไม่ผ่านร้านค้า/ไม่เสียเหรียญ) — ใช้กับเอฟเฟกต์ตัวละครที่ "ได้รับไอเทม +1 ชิ้น"
//  item = { type, value?, size? } รูปแบบเดียวกับของในร้าน — คืน item ที่เข้าคลังจริง · กระเป๋าเต็ม = ไม่ได้ (null)
function grantInventoryItem(p, item) {
  if (!p || !item || !item.type) return null;
  if (bagFull(p)) return null;
  p.inventory = p.inventory || [];
  const entry = { uid: `grant_${item.type}_${p.inventory.length}_${Date.now()}`, type: item.type, value: item.value, price: item.price || 0 };
  if (item.type === "battery") entry.charge = 0;
  p.inventory.push(entry);
  return entry;
}
// ซื้อสินค้า: ใครกดก่อนได้ก่อน (Node เป็น single-thread — ประมวลผลทีละ event จึงไม่มี race condition จริง)
// หลับไหล: "ออกการกระทำใดๆ ไม่ได้" — จั่ว/กดสกิลกันไว้ด้วย p.locked อยู่แล้ว
//  แต่ร้านค้า/ไอเทมไม่ได้ผูกกับ p.locked ทั้งหมด (บางชนิดกดใช้นอกเฟสจั่วได้) จึงต้องมีด่านของตัวเอง
function asleep(p) { return !!p && ((p.statuses && p.statuses.sleep) || 0) > 0; }

// เปิดดูร้าน (ตาของตัวเอง · ยืนติดร้าน) = เดินต่อไม่ได้แล้ว แม้ไม่ซื้อ (ผู้ใช้สั่ง 2026-10-24) — ยังตี/ใช้สกิลได้ เหมือนซื้อ
// ร้านที่ผู้เล่นยืนติด (shopId ไม่ระบุ = ร้านไหนก็ได้ที่ยืนติด — ทางเข้าเดิม)
const adjacentShop = (p, shopId) => (shopId ? [shopById(shopId)] : shopsList()).find((s) => nearShopOf(p, s)) || null;
function viewShop(id, shopId) {
  const p = match.players[id];
  if (!p || !p.alive || (p.summon && !p.summon.controlled)) return;
  if (!action.canAct(p) || match.action.locked) return;
  if (!adjacentShop(p, shopId)) return;
  action.lockMove(p);
  view.broadcastState();
}
function buyShopItem(id, shopId, itemId) {
  if (itemId === undefined) { itemId = shopId; shopId = null; } // ทางเข้าเดิม buyShopItem(id, itemId) — หาร้านที่มีของชิ้นนี้
  const p = match.players[id];
  if (!p || !p.alive || (p.summon && !p.summon.controlled)) return; // ร่างแยกที่คุมได้ซื้อให้เจ้าของได้ (เหรียญ/กระเป๋าใช้ร่วม — ผู้ใช้สั่ง 2026-10-21) · ตัวเหมือนซื้อไม่ได้
  if (!action.canAct(p)) return; // ซื้อได้เฉพาะตาเดินของตัวเอง
  if (asleep(p)) return; // หลับไหล: ซื้อของไม่ได้
  const sh = shopId ? shopById(shopId) : shopsList().find((s) => (s.items || []).some((it) => it.id === itemId));
  if (!nearShopOf(p, sh)) return; // ต้องยืนติดร้าน (ระยะ 1 จากขอบร้าน) — GRID_PLAN §8.1
  if (bagFull(p)) return; // กระเป๋าเต็ม
  const item = (sh.items || []).find((it) => it.id === itemId);
  if (!item || item.sold) return;
  if ((p.gold || 0) < item.price) return;
  p.inventory = p.inventory || [];
  if (item.type === "torch" && !require("./fodlan/stage2").torchOnSale()) return; // คบเพลิง: ขายเฉพาะ Fodlan ด่าน II
  item.bought = (item.bought || 0) + 1; // ช่องละหลายชิ้น (refreshShopForJourney คิด stock/sold ใหม่)
  item.soldTo = p.id;
  refreshShopForJourney();
  p.gold -= item.price;
  action.lockMove(p); // ซื้อแล้วเดินไม่ได้อีก (ยังตีได้)
  const entry = { uid: `${item.id}_${p.inventory.length}_${Date.now()}`, type: item.type, value: item.value, price: item.price };
  if (item.type === "battery") entry.charge = 0; // วงจรพลังงาน: ซื้อมาว่าง ชาร์จเองทุกจบเทิร์น
  p.inventory.push(entry);
  match.lastLog.push(`🛍️ ${p.name} ซื้อ ${shopItemName(item)} จาก${SHOP_NAMES[sh.kind] || "ร้านค้า"} (-${item.price} เหรียญ)`);
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
  if (item.type === "lawHeart" || item.type === "giornoArrow") { // ธนู Requiem: จบตา (characters/giorno_giovanna.js)
    const hook = CHAR_HOOKS[p.characterId];
    if (!hook || !hook.useCharItem || (hook.canUseCharItem && !hook.canUseCharItem(engine, p, item))) return;
    action.lockMove(p);
    hook.useCharItem(engine, p, item, opts);
    return;
  }
  // ---------- วงจรพลังงาน (ผู้ใช้สั่ง 2026-11-08): ถอนแต้มสกิลออกจากถังเท่าที่เลือก — ถังอยู่ในกระเป๋าต่อ ----------
  //  opts.amount = จำนวนที่ถอน (ตัดเหลือเท่าที่ถังมี และเท่าที่แต้มสกิลยังว่างถึงเพดาน) · ถอนไม่ได้เลย = ไม่มีผล ไม่ล็อกการเดิน
  if (item.type === "battery") {
    if (combat.skillGainBlocked(p, "item")) return; // ฮุค blocksSkillGain (ชิโร่/เฟิร์น): ไอเทมเพิ่มแต้มไม่มีผล
    const room = Math.max(0, combat.maxSkillOf(p) - (p.skillPoints || 0));
    const want = Math.floor(Number(opts.amount));
    const n = Math.min(item.charge || 0, room, Number.isFinite(want) && want > 0 ? want : 0);
    if (n <= 0) return;
    item.charge -= n;
    combat.addSkill(p, n, "item");
    match.lastLog.push(`🔋 ${p.name} ถอนแต้มสกิล +${n} จากวงจรพลังงาน (เหลือ ${item.charge}/${BATTERY_MAX})`);
    action.lockMove(p);
    itemUsed(p, item);
    view.broadcastState();
    return;
  }
  // ---------- รองเท้าวายุ (ผู้ใช้สั่ง 2026-11-08): ระยะเดินตานี้ +2 · ใช้แล้วยังเดินได้ (ไม่ล็อกการเดิน) ----------
  //  ใช้ได้เมื่อยังเดินได้อยู่ (ยังไม่ได้ใช้สกิล/ไอเทม/ซื้อของ · ไม่ใช่เดินต่อหลังจบตา) · ใส่ซ้ำในตาเดียวกันได้ (ซ้อน)
  if (item.type === "windBoots") {
    const a = match.action;
    if (!a || a.locked || a.canto) return;
    a.movBonus = (a.movBonus || 0) + WIND_BOOTS_MOV;
    if (a.movLeft != null) a.movLeft += WIND_BOOTS_MOV; // ระบบคู่: ระยะที่เหลือหลังสลับตัว
    p.inventory.splice(idx, 1);
    match.lastLog.push(`👟 ${p.name} สวมรองเท้าวายุ — ระยะเดินตานี้ +${WIND_BOOTS_MOV}`);
    itemUsed(p, item);
    view.broadcastState();
    return;
  }
  if (item.type === "resist") {
    p.statuses.resist = Math.max(p.statuses.resist || 0, SHOP_RESIST_TURNS);
    match.lastLog.push(`🛡️ ${p.name} ใช้ยาต้านสถานะ — ต้านสถานะผิดปกติ ${SHOP_RESIST_TURNS} เทิร์น จากคลัง`);
  } else if (item.type === "lifeCrystal") {
    // ผลึกชีวิต: พลังชีวิตสูงสุด +1 ถาวร (ทั้งแมตช์) แล้วฟื้น 1 (เคารพสถานะห้ามฟื้น)
    p.crystalHp = (p.crystalHp || 0) + 1;
    combat.healHp(p, 1);
    match.lastLog.push(`💗 ${p.name} ใช้ผลึกชีวิต — พลังชีวิตสูงสุด +1 (${combat.maxHpOf(p)})`);
  } else if (item.type === "armorCrystal") {
    // ผลึกเกราะ: เกราะสูงสุด +1 ถาวร (ทั้งแมตช์) แล้วฟื้นเกราะ 1
    p.crystalArmor = (p.crystalArmor || 0) + 1;
    combat.healArmor(p, 1);
    match.lastLog.push(`💠 ${p.name} ใช้ผลึกเกราะ — เกราะสูงสุด +1 (${combat.maxArmorOf(p)})`);
  } else if (item.type === "cleanse") {
    // ยาล้างสถานะ (ผู้ใช้สั่ง 2026-11-08): ผู้ใช้เลือกสถานะเอง (opts.status) · ลดทีละ 1 ขั้น (ค่าของสถานะ −1 · ถึง 0 = หาย)
    //  สถานะที่เลือกต้องเป็นดีบัฟที่ล้างได้และติดอยู่ (cleansableOf) — ไม่งั้นใช้ไม่ได้ ไม่เสียของ
    const k = String(opts.status || "");
    if (!cleansableOf(p).includes(k)) return;
    p.statuses[k]--;
    if (p.statuses[k] <= 0) {
      delete p.statuses[k];
      if (p.statusAmt) delete p.statusAmt[k];
      if (p.statusAt) delete p.statusAt[k];
    }
    match.lastLog.push(`💧 ${p.name} ใช้ยาล้างสถานะ — ล้างสถานะผิดปกติ 1 ขั้น`);
  } else if (item.type === "armor") {
    const healed = combat.healArmor(p, item.value);
    match.lastLog.push(`🔧 ${p.name} ใช้ยาฟื้นเกราะ +${healed} จากคลัง`);
  } else if (item.type === "torch") {
    // คบเพลิง (Fodlan ด่าน II — server/fodlan/stage2.js): ปักบนช่องที่ยืน · นอกด่าน/ช่องมีคบเพลิงแล้ว = ใช้ไม่ได้ ไม่เสียของ
    if (!require("./fodlan/stage2").useTorch(p)) return;
  } else {
    return;
  }
  action.lockMove(p);
  p.inventory.splice(idx, 1);
  itemUsed(p, item);
  view.broadcastState();
}
// ใช้ไอเทมจากกระเป๋าสำเร็จ → ฮุค onItemUsed(engine, p, item) ของตัวละครผู้ใช้ (ออพติมัส ไพร์ม: คริ +25% จนจบเทิร์น)
function itemUsed(p, item) {
  const hook = CHAR_HOOKS[p.characterId];
  if (hook && hook.onItemUsed) combat.runHook(hook, "onItemUsed", engine, p, item);
}
// ---------- ไอเทมช่วงจั่วไพ่ (ผู้ใช้สั่ง 2026-10-18) ----------
//  ยาโชคลาภ / ยาเปลี่ยนสีการ์ด / กรรไกรตัดไพ่ ใช้ได้เฉพาะช่วงจั่วไพ่ ก่อนกด "พอ" — เปิดกระเป๋าใช้ (ผู้ใช้สั่ง 2026-11-08 · ตาเดินกดใช้ไม่ได้)
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
  } else if (item.type === "cardCut") {
    // กรรไกรตัดไพ่ (เดิมคือยาลดไพ่ — ผู้ใช้สั่งคืน 2026-11-08): ตัดไพ่ใบล่าสุดในมือ คืนเข้ากองกลาง · ใช้ตอนไพ่แตกเพื่อกันแตกได้
    if (!(p.cards || []).length) return;
    const removed = p.cards.pop();
    match.centralDeck.push(removed);
    p.busted = cardDeck.bustedOf(p);
    match.lastLog.push(`✂️ ${p.name} ใช้กรรไกรตัดไพ่ — ตัดไพ่ใบล่าสุด (${cardLabel(removed)}) คืนเข้ากองกลาง`);
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
// วงจรพลังงาน: จบเทิร์นชาร์จ +BATTERY_REGEN ต่อถัง (เพดาน BATTERY_MAX) — เรียกจาก endTurn · ระบบคู่ใช้กระเป๋าร่วม = นับครั้งเดียวต่อฝ่าย
function chargeBatteries() {
  for (const p of Duo.cardHolders()) {
    for (const it of p.inventory || []) {
      if (it.type === "battery") it.charge = Math.min(BATTERY_MAX, (it.charge || 0) + BATTERY_REGEN);
    }
  }
}
// ดีบัฟที่ยาล้างสถานะล้างได้และกำลังติดอยู่ (คีย์ใน p.statuses) — ส่งให้เจ้าตัวเลือกในกระเป๋า (view.js cleansable)
function cleansableOf(p) {
  if (!p || !p.statuses) return [];
  return BASIC_DEBUFF_CLEAR.concat(SOFT_DEBUFF_STEP).filter((k) => (p.statuses[k] || 0) > 0);
}
Object.assign(module.exports, { SHOP_NAMES, SHOP_ITEMS, MERCHANT_PCT, MERCHANT_TURNS });

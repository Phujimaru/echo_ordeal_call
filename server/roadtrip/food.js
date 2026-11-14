// Road Trip: วัตถุดิบ + ทำอาหาร (ผู้ใช้สั่ง 2026-11-14 · GRID_PLAN §8.8 "แคมป์/ทำอาหาร") — ตารางเดียวของตัวเลขทั้งหมด [Claude ตั้ง]
//  วัตถุดิบ 6 ชนิด (ing*) = ของในกระเป๋า ซ้อนได้ช่องละ STACK ชิ้น (it.qty) — ขายที่แผงวัตถุดิบในปั๊ม (prop "grocer") + พ่อค้าเร่ที่แคมป์ (50%)
//  เมนู 8 อย่าง (dish*) = วัตถุดิบ 2–3 ชนิด → อาหาร 1 จาน (ไม่ซ้อน) · ทำที่กองไฟในแคมป์ (camp.js — ใช้ของจากกระเป๋าก่อน แล้วค่อยกล่องรถ)
//  กินได้ทุกที่นอกการต่อสู้ (rt:use → stop.useItem → eat) · กินที่กองไฟด้วยกัน ≥ 2 คนในแคมป์เดียว = โบนัส "อิ่มด้วยกัน" ทุกคนที่กินที่นั่น
const match = require("../match");

const STACK = 5;
const GREAT_HEAL = 1;
const ING = {
  ingRice: { name: "ข้าว", price: 1 },
  ingEgg: { name: "ไข่", price: 1 },
  ingVeg: { name: "ผัก", price: 1 },
  ingSpice: { name: "เครื่องปรุง", price: 1 },
  ingMeat: { name: "เนื้อ", price: 2 },
  ingFish: { name: "ปลาสด", price: 2 },
};
const GROCER_STOCK = 3; // ชิ้นต่อชนิดต่อจุดพัก (แผงวัตถุดิบในปั๊ม)
const VENDOR_STOCK = 2; // พ่อค้าเร่ที่แคมป์
const VENDOR_PCT = 50;
// eff: heal = พลังชีวิต · armor = เกราะ · cleanse = ล้างสถานะผิดปกติทั้งหมด · van = HP รถตู้ · team = พลังชีวิตทั้งทีม · buff = สู้ครั้งหน้า
const RECIPES = [
  { id: "omelet", dish: "dishOmelet", name: "ข้าวไข่เจียว", need: { ingRice: 1, ingEgg: 1 }, eff: { heal: 3 } },
  { id: "friedrice", dish: "dishFriedRice", name: "ข้าวผัด", need: { ingRice: 1, ingEgg: 1, ingVeg: 1 }, eff: { heal: 4, armor: 1 } },
  { id: "steak", dish: "dishSteak", name: "สเต๊กกระทะ", need: { ingMeat: 1, ingSpice: 1 }, eff: { heal: 2, buff: { key: "might", amt: 1, turns: 2, name: "เสริมพลัง" } } },
  { id: "saltfish", dish: "dishFish", name: "ปลาเผาเกลือ", need: { ingFish: 1, ingSpice: 1 }, eff: { heal: 2, buff: { key: "evade", amt: 25, turns: 2, name: "หลบหลีก" } } },
  { id: "tomyum", dish: "dishTomYum", name: "ต้มยำ", need: { ingFish: 1, ingVeg: 1, ingSpice: 1 }, eff: { heal: 3, cleanse: true } },
  { id: "salad", dish: "dishSalad", name: "สลัดผัก", need: { ingVeg: 1, ingEgg: 1 }, eff: { armor: 2, buff: { key: "guard", amt: 1, turns: 2, name: "คุ้มครอง" } } },
  { id: "lunch", dish: "dishLunch", name: "ข้าวกล่องช่าง", need: { ingRice: 1, ingMeat: 1 }, eff: { heal: 1, van: 4 } },
  { id: "hotpot", dish: "dishHotpot", name: "หม้อไฟรวมมิตร", need: { ingMeat: 1, ingFish: 1, ingVeg: 1 }, eff: { team: 2 } },
];
const DISH = Object.fromEntries(RECIPES.map((r) => [r.dish, r]));
const FEAST = { min: 2, reach: 2, buff: { key: "guard", amt: 1, turns: 1, name: "อิ่มด้วยกัน" } };

const isIng = (type) => !!ING[type];
const isDish = (type) => !!DISH[type];
const qtyOf = (it) => (it && it.qty > 0 ? it.qty | 0 : 1);
function itemName(it) {
  if (ING[it.type]) return ING[it.type].name;
  if (DISH[it.type]) return DISH[it.type].name;
  return null;
}
// จำนวนรวมของชนิดนี้ในรายการ (นับ qty)
function countIn(list, type) { return (list || []).reduce((s, it) => s + (it && it.type === type ? qtyOf(it) : 0), 0); }
// ซ้อนเข้ากองเดิมที่ยังไม่เต็มได้ไหม
const stackRoom = (list, type) => isIng(type) && (list || []).some((it) => it && it.type === type && qtyOf(it) < STACK);
// ใส่ 1 ชิ้นเข้ากระเป๋า (วัตถุดิบซ้อนกองเดิมก่อน) → entry | null (เต็ม)
let SEQ = 0;
function addTo(p, type, extra = {}) {
  const shop = require("../shop");
  p.inventory = p.inventory || [];
  if (isIng(type)) {
    const st = p.inventory.find((it) => it && it.type === type && qtyOf(it) < STACK);
    if (st) { st.qty = qtyOf(st) + 1; return st; }
  }
  if (shop.bagFull(p)) return null;
  const entry = { uid: `rtf_${type}_${++SEQ}_${Date.now()}`, type, price: extra.price || 0, ...(isIng(type) ? { qty: 1 } : {}), ...(extra.great ? { great: true } : {}) };
  p.inventory.push(entry);
  return entry;
}
// ใส่ทั้งกอง/ทั้งชิ้นเข้ารายการ (กล่องรถ) — วัตถุดิบเติมกองเดิมก่อน · เหลือ = ช่องใหม่ (ถ้าไม่เกิน cap) → เหลือที่ใส่ไม่ได้ (0 = หมด)
function mergeInto(list, item, cap) {
  let left = qtyOf(item);
  if (isIng(item.type)) for (const st of list) {
    if (!left) break;
    if (!st || st.type !== item.type) continue;
    const room = STACK - qtyOf(st);
    if (room > 0) { const n = Math.min(room, left); st.qty = qtyOf(st) + n; left -= n; }
  }
  if (left > 0 && list.length < cap) { list.push({ ...item, ...(isIng(item.type) ? { qty: left } : {}) }); left = 0; }
  return left;
}
// เอาออก n ชิ้นจากรายการ (กองหมด = ลบช่อง) → จำนวนที่เอาออกได้
function takeFrom(list, type, n) {
  let left = n;
  for (let i = list.length - 1; i >= 0 && left > 0; i--) {
    const it = list[i];
    if (!it || it.type !== type) continue;
    const q = qtyOf(it), k = Math.min(q, left);
    left -= k;
    if (q - k <= 0) list.splice(i, 1); else it.qty = q - k;
  }
  return n - left;
}
const recipeOf = (id) => RECIPES.find((r) => r.id === id) || null;
// มีวัตถุดิบพอไหม (กระเป๋า + กล่องรถ)
function canCook(bag, stash, r) { return !!r && Object.entries(r.need).every(([t, n]) => countIn(bag, t) + countIn(stash, t) >= n); }
// ใช้วัตถุดิบ: กระเป๋าก่อน แล้วค่อยกล่องรถ
function consume(bag, stash, r) {
  for (const [t, n] of Object.entries(r.need)) { const got = takeFrom(bag, t, n); if (got < n) takeFrom(stash, t, n - got); }
}

// กินอาหาร (นอกการต่อสู้) → { text, ... } | null · ไม่ล้มเหลว (ฟื้นเกินเต็ม = ไม่มีผลส่วนนั้น)
function eat(p, item) {
  const r = DISH[item && item.type];
  const RT = require("./index"), rt = match.roadtrip;
  if (!r || !rt || rt.phase === "combat" || rt.phase === "over" || !p.alive) return null;
  const combat = require("../combat"), e = r.eff;
  if (e.heal || item.great) combat.healHp(p, (e.heal || 0) + (item.great ? GREAT_HEAL : 0)); // อร่อยพิเศษ (คนข้าวดี — camp.js stir) = +1
  if (e.armor) combat.healArmor(p, e.armor);
  if (e.cleanse) { for (const k of require("../shop").cleansableOf(p)) { delete p.statuses[k]; if (p.statusAmt) delete p.statusAmt[k]; if (p.statusAt) delete p.statusAt[k]; } }
  if (e.van) rt.van.hp = Math.min(rt.van.hpMax, rt.van.hp + e.van);
  if (e.team) for (const u of RT.crew().filter((x) => x.alive)) combat.healHp(u, e.team);
  if (e.buff) (rt.buffs[p.id] || (rt.buffs[p.id] = [])).push({ ...e.buff });
  const feast = require("./camp").onEat(p); // กินที่กองไฟด้วยกัน = โบนัส (แคมป์เท่านั้น)
  match.lastLog.push(`🍽️ ${p.name} กิน${r.name}${feast ? " · อิ่มด้วยกัน" : ""}`);
  return { dish: item.type, feast };
}

module.exports = { GREAT_HEAL, STACK, ING, GROCER_STOCK, VENDOR_STOCK, VENDOR_PCT, RECIPES, DISH, FEAST, isIng, isDish, qtyOf, itemName, countIn, stackRoom, addTo, mergeInto, takeFrom, recipeOf, canCook, consume, eat };

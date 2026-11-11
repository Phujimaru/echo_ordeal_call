// ============================================================
//  สนาม Eos — ของประจำเมือง (ผู้ใช้สั่ง 2026-11-12 "ทำครบทุกเมือง" — เดิมนอกจาก Insomnia เมืองอื่นไม่น่าไปอยู่ · ตัวเลข Claude ตั้ง)
//   Hammerhead  อู่ (G): ยืนติดอู่ ขับรถอยู่หรือรถจอดติดตัว → ซ่อมเต็ม + เทอร์โบ เดิน +2 3 เทิร์น (คันละครั้งทุก 3 เทิร์น)
//   ร้านอาหาร (D — Hammerhead + หมู่บ้านทะเลสาบ): จ่าย 4 เหรียญ (หรือปลา 1) → ฟื้นเลือด 3 + บัฟงานเลี้ยง (ตี +1 เดิน +1 ฟื้นเลือด 1/เทิร์น) 3 เทิร์น · คนละครั้งทุก 3 เทิร์น
//   Altissia    ศาลเทพธิดา (S): ทั้งทีมฟื้นเกราะ 2 · ทั้งทีมครั้งเดียวทุก 4 เทิร์น · ลานน้ำพุ (map.heal) จบตาฟื้นเลือด 1
//   Duscae      บ้านฟาร์ม (H): จ่าย 3 เหรียญ เรียกโชโกโบะที่ว่างมายืนข้างตัว
//  สถานะ = s.tw · ใช้การโจมตีทุกอย่าง (ctx.useStrike)
// ============================================================
const lazyShop = () => require("../shop");
const MAP = require("./map6");
const listOf = (kind) => (MAP.map.terrain[kind] || []).map(([x, y]) => ({ x, y }));
const SPOTS = { garage: listOf("fd_eos_garage"), diner: listOf("fd_eos_diner"), shrine: listOf("fd_eos_shrine"), ranch: listOf("fd_eos_ranch") };
const TOWN = {
  garage: { turbo: 2, turns: 3, cd: 3 },
  diner: { gold: 4, heal: 3, turns: 3, cd: 3 },
  shrine: { armor: 2, cd: 4 },
  ranch: { gold: 3 },
};
const TW = (s) => (s.tw ||= { turbo: {}, garageCd: {}, dinerCd: {}, shrineCd: 0 });
const near = (ctx, p, list) => !!(p && p.pos && list.some((t) => ctx.adjacent(p, t.x, t.y)));
const gold = (p) => (p && p.gold) || 0;
function pay(p, n) { if (gold(p) < n) return false; p.gold -= n; return true; }

// รถที่ซ่อมได้: คันที่ขับอยู่ หรือคันว่างที่จอดติดตัว
function carFor(ctx, s, H, p) {
  return H.carOf(ctx, s, p) || s.cars.find((c) => !c.driver && Math.abs(c.x - p.pos.x) + Math.abs(c.y - p.pos.y) === 1) || null;
}
function hud(ctx, s, H, p, out) {
  if (!p || !p.pos) return;
  const r = ctx.match.roundNumber, w = TW(s), off = !H.canStrike(ctx, p);
  if (near(ctx, p, SPOTS.garage)) {
    const c = carFor(ctx, s, H, p);
    out.push({ key: "fd:garage", icon: "🔧", name: "อู่", desc: `ซ่อมรถเต็ม + เทอร์โบ เดิน +${TOWN.garage.turbo} ${TOWN.garage.turns} เทิร์น (ขับอยู่ หรือรถจอดติดตัว · คันละครั้งทุก ${TOWN.garage.cd} เทิร์น) — ใช้การโจมตี`, disabled: off || !c || (w.garageCd[c.id] || 0) > r });
  }
  if (near(ctx, p, SPOTS.diner)) {
    const fish = (H.p4State(s).catch || {})[p.id] || 0;
    out.push({ key: "fd:diner", icon: "🍽️", name: "ร้านอาหาร", desc: `${fish ? "ใช้ปลา 1" : `จ่าย ${TOWN.diner.gold} เหรียญ`} — ฟื้นเลือด ${TOWN.diner.heal} + งานเลี้ยง ${TOWN.diner.turns} เทิร์น (ตี +1 · เดิน +1 · ฟื้นเลือด 1 ทุกต้นเทิร์น) · คนละครั้งทุก ${TOWN.diner.cd} เทิร์น — ใช้การโจมตี`, disabled: off || (w.dinerCd[p.id] || 0) > r || (!fish && gold(p) < TOWN.diner.gold) });
  }
  if (near(ctx, p, SPOTS.shrine)) out.push({ key: "fd:shrine", icon: "⛩️", name: "ศาลเทพธิดา", desc: `ทั้งทีมฟื้นเกราะ ${TOWN.shrine.armor} (ทั้งทีมครั้งเดียวทุก ${TOWN.shrine.cd} เทิร์น) — ใช้การโจมตี`, disabled: off || w.shrineCd > r });
  if (near(ctx, p, SPOTS.ranch)) out.push({ key: "fd:ranch", icon: "🐤", name: "เรียกโชโกโบะ", desc: `จ่าย ${TOWN.ranch.gold} เหรียญ — โชโกโบะที่ว่างวิ่งมายืนข้างตัว — ใช้การโจมตี`, disabled: off || gold(p) < TOWN.ranch.gold || !freeChoco(s) });
}
const freeChoco = (s) => s.chocos.find((c) => !c.rider && c.x != null && !(c.back > 0) && (c.hp ?? 1) > 0) || null;
function action(ctx, s, H, p, key) {
  if (!["fd:garage", "fd:diner", "fd:shrine", "fd:ranch"].includes(key)) return null;
  if (!p || !p.pos || !H.canStrike(ctx, p)) return false;
  const r = ctx.match.roundNumber, w = TW(s);
  if (key === "fd:garage") {
    const c = near(ctx, p, SPOTS.garage) && carFor(ctx, s, H, p);
    if (!c || (w.garageCd[c.id] || 0) > r) return false;
    c.hp = H.CAR_HP; c.broken = false;
    w.turbo[c.id] = r + TOWN.garage.turns - 1;
    w.garageCd[c.id] = r + TOWN.garage.cd;
    ctx.fx("town_garage", { id: p.id, car: c.id, x: c.x, y: c.y });
    ctx.log(`🔧 ${p.name} เข้าอู่ Hammerhead — รถซ่อมเต็ม + เทอร์โบ ${TOWN.garage.turns} เทิร์น`);
  } else if (key === "fd:diner") {
    if (!near(ctx, p, SPOTS.diner) || (w.dinerCd[p.id] || 0) > r) return false;
    const q = H.p4State(s), cat = (q.catch ||= {});
    if ((cat[p.id] || 0) > 0) cat[p.id] -= 1;
    else if (!pay(p, TOWN.diner.gold)) return false;
    if (ctx.combat.healHp) ctx.combat.healHp(p, TOWN.diner.heal);
    q.buffs[p.id] = { kind: "feast", from: r, until: r + TOWN.diner.turns - 1 };
    w.dinerCd[p.id] = r + TOWN.diner.cd;
    ctx.fx("town_diner", { id: p.id, x: p.pos.x, y: p.pos.y });
    ctx.log(`🍽️ ${p.name} ฝากท้องที่ร้านอาหาร — ฟื้นเลือด + งานเลี้ยง ${TOWN.diner.turns} เทิร์น`);
  } else if (key === "fd:shrine") {
    if (!near(ctx, p, SPOTS.shrine) || w.shrineCd > r) return false;
    const got = [];
    for (const o of H.heroes(ctx)) if (o.alive && ctx.combat.healArmor) { ctx.combat.healArmor(o, TOWN.shrine.armor); got.push(o.id); }
    w.shrineCd = r + TOWN.shrine.cd;
    ctx.fx("town_shrine", { id: p.id, x: p.pos.x, y: p.pos.y, ids: got });
    ctx.log(`⛩️ ${p.name} อธิษฐานที่ศาลเทพธิดา — ทั้งทีมฟื้นเกราะ ${TOWN.shrine.armor}`);
  } else if (key === "fd:ranch") {
    const c = near(ctx, p, SPOTS.ranch) && freeChoco(s);
    const at = c && H.freeNear(ctx, s, p.pos.x, p.pos.y, 2);
    if (!c || !at || !pay(p, TOWN.ranch.gold)) return false;
    const from = { x: c.x, y: c.y };
    c.x = at.x; c.y = at.y;
    ctx.fx("town_ranch", { id: p.id, choco: c.id, from, to: { ...at } });
    ctx.log(`🐤 ${p.name} เรียกโชโกโบะจากฟาร์ม Duscae`);
  }
  ctx.bump();
  ctx.useStrike(p, 1.3);
  return true;
}
// เทอร์โบของรถที่ p ขับ (stage6.movMod)
function carMov(ctx, s, H, p) {
  const c = H.carOf(ctx, s, p), w = TW(s);
  return c && (w.turbo[c.id] ?? -1) >= ctx.match.roundNumber ? TOWN.garage.turbo : 0;
}
function publicOf(ctx, s) {
  const w = TW(s), r = ctx.match.roundNumber;
  return { townSpots: { garage: SPOTS.garage, diner: SPOTS.diner, shrine: SPOTS.shrine, ranch: SPOTS.ranch }, turbo: Object.keys(w.turbo).filter((id) => w.turbo[id] >= r), shrineReady: !(w.shrineCd > r) };
}

module.exports = { TOWN, SPOTS, TW, hud, action, carMov, publicOf };

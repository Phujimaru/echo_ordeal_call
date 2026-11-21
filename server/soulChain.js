// ============================================================
//  โซ่ Soul Chain Deathmatch — ระบบกลาง (ต้นแบบ แม็กน่า สวิง · characters/magna.js · GRID_PLAN §7.35 · GAME_SYSTEM §59)
//
//  p.soulChain = { with: id อีกฝ่าย, by: id เจ้าของโซ่ (แม็กน่า), at: ลำดับตัดผล (Sever) }  — ติดทั้งสองฝั่ง
//  คนที่ถูกเชื่อมโซ่ (ทั้งสองฝ่าย):
//   · แชร์แต้มสกิล: skillPoints ของทั้งคู่ชี้กองเดียวกัน (accessor) เพดาน POOL_MAX · โซ่หาย = แบ่งครึ่ง เศษให้เจ้าของโซ่
//   · ห่างกันไม่เกิน LEASH ช่อง: เดิน (action.leashOf) + ถูกผลัก/ดึง (Ice.pushUnit หยุดที่ขอบโซ่)
//   · ใช้สกิลเคลื่อนที่ไม่ได้ (MOVES — ป้ายของทุกตัวละครที่ย้ายตัวเอง · ปุ่ม HUD ACTIONS · ขี่ไม่ได้)
//   · โจมตี/เล็ง/ได้รับผลจากคนอื่นไม่ได้ ยกเว้นอีกฝ่าย (apart) — ตีปกติ · สกิล (resolveArea) · ดาเมจ · ดีบัฟ · บัฟ · ฮีล
//     ผลสนามที่ไม่มีต้นตอยังโดน
//   · ใช้ไอเทมช่วงจั่ว (ยาเปลี่ยนสีการ์ด / ยาโชคลาภ / กรรไกรตัดไพ่) ไม่ได้
//   · ลดความเสียหายใส่กัน: เหลือไม่ต่ำกว่า 1 · ส่วนที่ถูกกันไว้ใช้ลดฮิตถัดไปของการโจมตีเดียวกัน (floorDamage)
// ============================================================
Object.assign(module.exports, {
  partnerOf, linked, apart, blocks, leashOf, link, unlink, unlinkOf, clampPush, floorDamage,
  itemBlocked, skillBlocked, actionBlocked, publicOf, resetPlayer,
});

const match = require("./match");

const LEASH = 4;
const POOL_MAX = 8;
const DRAW_ITEMS = new Set(["cardColor", "fortune", "cardCut"]);
module.exports.LEASH = LEASH;
module.exports.POOL_MAX = POOL_MAX;

// ---------- คู่โซ่ ----------
function linked(p) { return !!partnerOf(p); }
function partnerOf(p) {
  const l = p && p.soulChain;
  if (!l) return null;
  const q = match.players[l.with];
  if (!q || !q.soulChain || q.soulChain.with !== p.id) return null;
  ensurePool(p, q);
  return q;
}
// a กับ b ทำอะไรใส่กันไม่ได้ (คนใดคนหนึ่งติดโซ่กับคนอื่น) — ตัวเองกับตัวเอง = ได้
function apart(a, b) {
  if (!a || !b || a.id === b.id) return false;
  const pa = partnerOf(a), pb = partnerOf(b);
  return !!((pa && pa.id !== b.id) || (pb && pb.id !== a.id));
}
// ต้นตอปัจจุบัน (effectSource) ทำผลใส่ target ไม่ได้
function blocks(target) {
  const src = match.effectSourceId && match.players[match.effectSourceId];
  return !!src && apart(src, target);
}

// ---------- สายจูง ----------
function leashOf(p) {
  const q = partnerOf(p);
  return q && q.pos ? { x: q.pos.x, y: q.pos.y, r: LEASH } : null;
}
// ผลักทีละก้าว: ก้าวไป (x, y) แล้วห่างคู่โซ่เกิน LEASH = หยุด (นับเป็นชน)
function clampPush(u, x, y) {
  const q = partnerOf(u);
  if (!q || !q.pos) return false;
  return Math.abs(x - q.pos.x) + Math.abs(y - q.pos.y) > LEASH;
}

// ---------- แต้มสกิลกองกลาง ----------
// ตัวที่ถือแต้มจริง: ระบบคู่ (server/duo.js) ตัวที่สองอ่าน/เขียนแต้มของเจ้าของผ่าน accessor → กองโซ่ต้องติดที่เจ้าของ
function holderOf(p) { return (p && p.duoOf && match.players[p.duoOf]) || p; }
function definePool(p, pool) {
  p = holderOf(p);
  Object.defineProperty(p, "skillPoints", {
    configurable: true, enumerable: true,
    get: () => pool.v,
    set: (n) => { pool.v = Math.max(0, Math.min(POOL_MAX, Number(n) || 0)); },
  });
  p._chainPool = true;
}
const pooled = (p) => { const d = Object.getOwnPropertyDescriptor(p, "skillPoints"); return !!(d && d.get); };
function ensurePool(a, b) {
  a = holderOf(a); b = holderOf(b);
  if (a === b || (a._chainPool && b._chainPool && pooled(a) && pooled(b))) return;
  // ถูกย้อน (หยุดเวลา) หลังโซ่ขาด/ก่อนโซ่ติด = ค่าธรรมดาค้าง → ต่อกองใหม่จากค่าที่มากกว่า
  const v = Math.max(Number(a.skillPoints) || 0, Number(b.skillPoints) || 0);
  const pool = { v: Math.min(POOL_MAX, v) };
  definePool(a, pool); definePool(b, pool);
}
function unpool(p, v) {
  p = holderOf(p);
  if (p._chainPool && pooled(p)) delete p.skillPoints;
  delete p._chainPool;
  p.skillPoints = v;
}

// ---------- เชื่อม/ปลด ----------
function link(owner, target, stamp) {
  const pool = { v: Math.min(POOL_MAX, (Number(owner.skillPoints) || 0) + (Number(target.skillPoints) || 0)) };
  owner.soulChain = { with: target.id, by: owner.id, at: stamp || 0 };
  target.soulChain = { with: owner.id, by: owner.id, at: stamp || 0 };
  definePool(owner, pool); definePool(target, pool);
}
// ปลดโซ่ของ p (และอีกฝ่าย) · แบ่งแต้มครึ่ง เศษให้เจ้าของโซ่ (ไม่เกินความจุของแต่ละคน)
function unlink(p) {
  if (!p || !p.soulChain) return null;
  const q = match.players[p.soulChain.with];
  const ownerId = p.soulChain.by;
  const total = Number(p.skillPoints) || 0;
  const maxOf = (u) => { try { return require("./combat").maxSkillOf(u); } catch { return POOL_MAX; } };
  const pair = [p, q].filter((u) => u && u.soulChain && (u === p || u.soulChain.with === p.id));
  const lo = Math.floor(total / 2), hi = total - lo;
  for (const u of pair) {
    const share = pair.length === 1 ? total : (u.id === ownerId ? hi : lo);
    u.soulChain = null;
    unpool(u, Math.min(maxOf(u), share));
  }
  if (!pair.includes(p)) { p.soulChain = null; unpool(p, Math.min(maxOf(p), total)); }
  return q || null;
}
// ปลดทุกโซ่ที่ owner เป็นเจ้าของ
function unlinkOf(ownerId) {
  for (const u of Object.values(match.players)) if (u.soulChain && u.soulChain.by === ownerId) unlink(u);
}
// เริ่มแมตช์/ฟื้น (resetCombat): ล้างโซ่ค้างของคนนี้ (ไม่แตะแต้ม — resetCombat ตั้งเอง)
function resetPlayer(p) {
  if (!p) return;
  // ถอดเฉพาะกองของโซ่ (p._chainPool) — แต้มกองกลางของระบบคู่ (server/duo.js เคท & เอมิลิโกะ) เป็น accessor เหมือนกัน ห้ามแตะ
  if (p._chainPool && pooled(p)) { const v = Number(p.skillPoints) || 0; delete p.skillPoints; p.skillPoints = v; }
  delete p._chainPool;
  p.soulChain = null;
  p._chainCut = null;
}

// ---------- ลดความเสียหายไม่ต่ำกว่า 1 ----------
// n0 = ก่อนลด · n1 = หลังลด (ฮุคของเป้า/ออร่า) → ค่าที่ลงจริง
//  ฮิตเดียว: ลดได้แต่ไม่ต่ำกว่า 1 · หลายฮิตในการโจมตีเดียว (match.cmdSeq): ส่วนที่ถูกกันไว้ไปลดฮิตถัดไป (1+1+1 ลด 1 = 2)
function floorDamage(p, n0, n1) {
  const src = match.effectSourceId && match.players[match.effectSourceId];
  if (!src || !p || src.id === p.id || !(n0 > 0)) return n1;
  const q = partnerOf(p);
  if (!q || q.id !== src.id) return n1;
  const key = `${src.id}:${match.cmdSeq || 0}:${match.roundNumber || 0}`;
  // ฮิตแรกของการโจมตี: ลดตามปกติแต่ไม่ต่ำกว่า 1 (ส่วนที่ลดไม่ได้จดไว้) · ฮิตถัดไป: ไม่ลดซ้ำ — ใช้ส่วนที่จดไว้ลดแทน
  if (!p._chainCut || p._chainCut.key !== key) {
    const out = n1 < 1 ? 1 : n1;
    p._chainCut = { key, owed: Math.max(0, out - Math.max(0, n1)) };
    return out;
  }
  const rec = p._chainCut;
  let out = Math.max(n0, n1);
  const c = Math.min(rec.owed, out);
  rec.owed -= c; out -= c;
  return out;
}

// ---------- ข้อห้าม ----------
function itemBlocked(p, item) { return linked(p) && !!item && DRAW_ITEMS.has(item.type); }

// ป้าย "สกิลเคลื่อนที่" (ย้ายตัวผู้ใช้เองบนกระดาน) ของทุกตัวละคร — ตัวละครใหม่ที่มีท่าพุ่ง/วาร์ป/สลับที่ ต้องเพิ่มที่นี่
//  (p, opts) → true = ท่านี้ย้ายตัวเอง · อ่านสถานะของตัวละครนั้นตรงๆ (ร่าง/ช่วงหยุดเวลา/การ์ด)
const MOVES = {
  celine: { basic: (p, o) => o.form === "swap" },
  diego_alt: { ultimate: (p) => !!(p.diego && p.diego.stopping) },
  diego_dino: { basic: (p) => !!(p.dino && p.dino.form === "dino"), secondary: (p) => !!(p.dino && p.dino.form === "dino"), ultimate: (p) => !!(p.dino && p.dino.form === "dino") }, // ร่างไดโนเสาร์: พุ่ง/กระโดด/กระโดดลง
  dio_brando: { ultimate: (p) => !!(p.dio && p.dio.stopping) },
  armstrong: { basic: () => true }, // อาร์มสตรอง: ขอสักหมัดเถอะ (พุ่งไปต่อยผู้โจมตี)
  foxy: { basic: () => true }, // ฟ็อกซี่: ขอสักทีนะ ที่หน้า (พุ่งแนวตรง 7)
  vergil: { ultimate: () => true }, // เวอจิล: Doppelganger พุ่งแนวตรง 4
  giorno_giovanna: { ultimate: (p) => !!(p.giorno && p.giorno.requiem) },
  kate: { secondary: (p, o) => o.form === "whip" || o.form === "wings" },
  emiliko: { ultimate: (p) => { const k = ownerShadow(p); return !!(k && k.weapon === "mop"); } },
  kensaki_kazuma: { ultimate: (p) => !!(p.kazuma && (p.kazuma.combo === "sonic" || p.kazuma.combo === "four")) },
  kusakabe_shinra: { ultimate: (p, o) => String(o.form || "").startsWith("latom:") },
  ryougi: { ultimate: () => true },
  roland: {
    basic: (p, o) => { const h = (p.roland && p.roland.hand) || []; const c = h.find((x) => x.uid === o.form); return !!(c && c.k === "crystal"); },
    ultimate: () => true,
  },
  sora_otosumi: { ultimate: (p) => !(p.sora && p.sora.frame === "tutle") },
  trafalgar_law: { secondary: (p, o) => o.form === "shuffle" && (!Array.isArray(o.tiles) || !p.pos || o.tiles.some((t) => t && t.x === p.pos.x && t.y === p.pos.y)) },
  // ชั้นมิติ (เดินทะลุ / กระดานคู่ขนาน) — แยกชั้นแล้วคู่โซ่ตีกันไม่ได้
  funny_valentine: { basic: () => true, ultimate: (p, o) => o.form === "parallel" },
};
const ACTIONS = { sliver_bullet: ["dash"], sora_otosumi: ["soraWarp"] };
function ownerShadow(p) {
  try { const o = require("./duo").ownerOf(p); return o && o.shadow; } catch { return null; }
}
// สกิลช่องนี้ (ตัวเลือก opts.form) ย้ายตัวเองไหม — ใช้ได้ทั้งตอนติดโซ่ (useSkill) และหน้าปุ่ม (view)
function movesSelf(p, tier, opts = {}) {
  const t = MOVES[p && p.characterId];
  const fn = t && t[tier];
  try { return !!(fn && fn(p, opts || {})); } catch { return false; }
}
function skillBlocked(p, tier, opts) { return linked(p) && movesSelf(p, tier, opts); }
function actionBlocked(p, key) {
  if (!linked(p)) return false;
  const list = ACTIONS[p.characterId];
  return !!(list && list.includes(key));
}
module.exports.movesSelf = movesSelf;
module.exports.MOVES = MOVES;

// ---------- ข้อมูลให้ client ----------
function publicOf(p) {
  const q = partnerOf(p);
  return q ? { with: q.id, by: p.soulChain.by } : null;
}

// ============================================================
//  สนาม Eos — มอนหัวหน้า (ผู้ใช้สั่ง 2026-11-12 "ทำมอนหัวหน้าต่อ" — เพื่อนขอมอนโหดขึ้น · ตัวเลขทั้งหมด Claude ตั้ง)
//   ปีศาจ/ทหารเหล็กที่เกิดใหม่มีโอกาสเป็น "หัวหน้า": เลือด ×1.5+2 · ตี +1 · ติดคุณสมบัติสุ่ม 1 อย่าง (ยาก/Lament มีโอกาสได้ 2)
//   ล้มแล้ว: เหรียญ ×3 + ได้ของแน่นอน + แต้มรวม +1
//   คุณสมบัติ:
//     swift     ว่องไว       เดิน +2
//     armored   เกราะหนา     เกราะ +3
//     vampiric  ดูดเลือด     ตีโดนใคร = ฟื้นเลือดตัวเองเท่าดาเมจ
//     volatile  ระเบิดตอนตาย  ล้มแล้วระเบิด 3×3 ดาเมจ 2 (ไม่โดนมอน)
//     commander ผู้บัญชาการ   มอนตัวอื่นในระยะ 2 ตี +1
//     regen     ฟื้นตัว       ต้นเฟสมอนฟื้นเลือด 2
//     thorns    หนาม         โดนตีจากช่องติดกัน = คนตีโดน 1
//  สถานะ = m.summon.elite (รายการคุณสมบัติ) · s.el (seq)
// ============================================================
const EL = {
  pct: { easy: 0.05, normal: 0.1, hard: 0.16, lament: 0.2 },
  twoPct: { hard: 0.4, lament: 0.55 },
  hpMul: 1.5, hpAdd: 2, atk: 1, goldMul: 3, score: 1,
  swiftMov: 2, armor: 3, blastDmg: 2, auraR: 2, auraAtk: 1, regen: 2, thorns: 1,
};
const AFFIXES = ["swift", "armored", "vampiric", "volatile", "commander", "regen", "thorns"];
const AFFIX_NAMES = { swift: "ว่องไว", armored: "เกราะหนา", vampiric: "ดูดเลือด", volatile: "ระเบิดตอนตาย", commander: "ผู้บัญชาการ", regen: "ฟื้นตัว", thorns: "หนาม" };
// ไม่เป็นหัวหน้า: บอส · ผู้คร่ำครวญ · หุ่นเกราะ · ฝูงจิ๋ว/ร่างแยก (ตัวเล็ก) · ระเบิด (ตายก็ระเบิดอยู่แล้ว)
const NO_ELITE = new Set(["boss", "mech", "swarm", "splitling", "bomber"]);
const diffOf = (ctx) => (ctx.match && ctx.match.eosDiff) || "normal";
const has = (m, a) => !!(m && m.summon && Array.isArray(m.summon.elite) && m.summon.elite.includes(a));
const isElite = (m) => !!(m && m.summon && Array.isArray(m.summon.elite) && m.summon.elite.length);
const capOf = (ctx, H) => 1 + Math.floor(H.heroes(ctx).length / 2);

// สุ่มตอนเกิด → รายการคุณสมบัติ หรือ null
function roll(ctx, s, H, type, extra = {}) {
  if (type !== "daemon" && type !== "magitek") return null;
  if (extra.swarmKid || extra.noElite || NO_ELITE.has(extra.trait)) return null;
  const d = diffOf(ctx), early = d === "hard" || d === "lament";
  if (type === "daemon" && (s.nightNo || 0) < (early ? 1 : 2)) return null;
  if (H.mobsOf(ctx).filter(isElite).length >= capOf(ctx, H)) return null;
  if (ctx.rng() >= (EL.pct[d] ?? EL.pct.normal)) return null;
  const n = ctx.rng() < (EL.twoPct[d] || 0) ? 2 : 1;
  return ctx.pick(AFFIXES, n);
}
function stats(st, aff) {
  return {
    ...st,
    hp: Math.round(st.hp * EL.hpMul) + EL.hpAdd,
    armor: st.armor + (aff.includes("armored") ? EL.armor : 0),
    atk: (st.atk | 0) + (st.atk > 0 ? EL.atk : 0),
    mov: st.mov + (aff.includes("swift") ? EL.swiftMov : 0),
    gold: Math.max(1, st.gold | 0) * EL.goldMul,
  };
}
const nameOf = (name) => `หัวหน้า${name}`;

// ต้นเฟสมอน: ฟื้นตัว
function beforeAct(ctx, s, H) {
  const out = [];
  for (const m of H.mobsOf(ctx)) {
    if (!has(m, "regen") || !(m.hp < (m.summon.maxHp || m.hp))) continue;
    const n = Math.min(EL.regen, m.summon.maxHp - m.hp);
    m.hp += n;
    out.push({ id: m.id, x: m.pos.x, y: m.pos.y, n });
  }
  if (out.length) { ctx.bump(); ctx.fx("elite_regen", { list: out }); }
  return out;
}
// ดาเมจเข้าผู้เล่นจากมอน: ผู้บัญชาการ +1 · ดูดเลือด (ฟื้นเท่าดาเมจที่ตั้งไว้)
function toHero(ctx, s, H, p, n, src) {
  if (!src || !src.pos || !H.isMob(src) || !(n > 0)) return n;
  if (H.mobsOf(ctx).some((o) => o !== src && has(o, "commander") && H.manhattan(o.pos, src.pos) <= EL.auraR)) n += EL.auraAtk;
  if (has(src, "vampiric") && src.alive && src.hp < (src.summon.maxHp || src.hp)) {
    const k = Math.min(n, src.summon.maxHp - src.hp);
    src.hp += k;
    ctx.fx("elite_drain", { id: src.id, from: p.pos ? { ...p.pos } : null, x: src.pos.x, y: src.pos.y, n: k });
  }
  return n;
}
// ดาเมจเข้ามอนหัวหน้า: หนาม — คนตีจากช่องติดกันโดน 1 (ครั้งละไม่ซ้อน)
let THORN_BUSY = false;
function toMob(ctx, s, H, m, n, src) {
  if (THORN_BUSY || !has(m, "thorns") || !(n > 0) || !src || !src.alive || !src.pos || H.isMob(src) || !m.pos) return n;
  if (!H.footOf(ctx, src).some((t) => H.manhattan(t, m.pos) === 1)) return n;
  THORN_BUSY = true;
  try { const dealt = H.hurt(ctx, src, EL.thorns); ctx.fx("elite_thorns", { id: m.id, target: src.id, x: m.pos.x, y: m.pos.y, dmg: dealt }); }
  finally { THORN_BUSY = false; }
  return n;
}
// ล้ม: ระเบิดตอนตาย · แต้มรวม
function onDeath(ctx, s, H, m, by) {
  if (!isElite(m)) return null;
  const at = m.pos ? { ...m.pos } : null;
  let hits = [];
  if (has(m, "volatile") && at) {
    const tiles = H.area3(at.x, at.y).filter((t) => ctx.Board.inBounds(ctx.map(), t.x, t.y));
    for (const u of H.unitsOn(ctx, tiles)) { if (H.isMob(u) || !u.alive) continue; hits.push({ id: u.id, dmg: ctx.combat.withEffectSource(m, () => ctx.damage(u, EL.blastDmg)) }); }
    ctx.fx("elite_blast", { id: m.id, x: at.x, y: at.y, tiles, hits });
    ctx.log(`💥 ${m.name}ระเบิดตอนล้ม!${hits.length ? ` โดน ${hits.length} ตัว` : ""}`);
  }
  if (H.addScore) H.addScore(ctx, s, EL.score, "elite");
  ctx.fx("elite_down", { id: m.id, x: at ? at.x : 0, y: at ? at.y : 0, by: by ? by.id : null });
  return { hits };
}
const publicOf = (m) => (isElite(m) ? m.summon.elite.slice() : null);

module.exports = { EL, AFFIXES, AFFIX_NAMES, NO_ELITE, roll, stats, nameOf, has, isElite, beforeAct, toHero, toMob, onDeath, publicOf, capOf };

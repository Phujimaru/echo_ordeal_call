// ============================================================
//  สนาม Eos — อาวุธจักรพรรดิ 13 อัน (ผู้ใช้สั่ง 2026-11-12 — เดิม "อาวุธหลวง" 3 สุสาน ตี +1 เหมือนกันหมด)
//   สุสาน 13 แห่ง แห่งละ 1 อาวุธ (ชื่อจริง · ภาพผู้ใช้ client/public/eos/img/arms/<id>.webp · ไม่มีคลิป — ผู้ใช้สั่ง)
//   ถือได้ทีละ 1 อัน ARM_TURNS เทิร์น · เปิดสุสานอื่น = เปลี่ยนอาวุธ · ตาที่ตีเสียเลือด 1 (ไม่ถึงตาย) ยกเว้น Sword of the Father
//   ผลต่อการตีปกติแต่ละอัน — ตัวเลข/ผล Claude ตั้ง:
// ============================================================
const ARMS = [
  { id: "wise", name: "Sword of the Wise", atk: 1, desc: "ตี +1 · ตีโดน = ฟื้นเกราะ 1" },
  { id: "conqueror", name: "Axe of the Conqueror", atk: 1, desc: "ตี +1 · ตีโดน = มอนที่ติดเป้าโดน 1 ทุกตัว" },
  { id: "clever", name: "Bow of the Clever", atk: 0, range: 2, desc: "ระยะตีปกติ +2" },
  { id: "wanderer", name: "Swords of the Wanderer", atk: 0, crit: 35, desc: "คริติคอล 35%" },
  { id: "rogue", name: "Star of the Rogue", atk: 1, desc: "ตี +1 · ตีโดน = เป้าเชื่องช้า 1 เทิร์น" },
  { id: "mystic", name: "Blade of the Mystic", atk: 1, desc: "ตี +1 · ตีโดน = ฟื้นเลือด 1" },
  { id: "tall", name: "Sword of the Tall", atk: 1, desc: "ตี +1 · ตีโดน = ผลักเป้าถอย 1 ช่อง" },
  { id: "warrior", name: "Katana of the Warrior", atk: 1, pierce: true, desc: "ตี +1 · ทะลุเกราะ" },
  { id: "fierce", name: "Mace of the Fierce", atk: 1, stun: 35, desc: "ตี +1 · ตีโดน 35% เป้าสตั้น 1 เทิร์น" },
  { id: "pious", name: "Scepter of the Pious", atk: 0, desc: "ตีโดน = เพื่อนในระยะ 2 ฟื้นเลือด 1" },
  { id: "oracle", name: "Trident of the Oracle", atk: 1, desc: "ตี +1 · แทงทะลุ: ตัวหลังเป้า 1 ช่องโดน 2" },
  { id: "just", name: "Shield of the Just", atk: 0, guard: 1, desc: "ดาเมจที่ได้รับ −1 (เหลืออย่างน้อย 1)" },
  { id: "father", name: "Sword of the Father", atk: 2, noDrain: true, desc: "ตี +2 · ไม่เสียเลือด" },
];
const BY_ID = Object.fromEntries(ARMS.map((a) => [a.id, a]));
const imgOf = (id) => `/eos/img/arms/${id}.webp`;
const armAt = (i) => ARMS[i] || ARMS[0];
const defOf = (rec) => (rec && BY_ID[rec.w]) || (rec ? ARMS[0] : null); // อาวุธหลวงแบบเก่า (ไม่มี w) = Sword of the Wise
const atkOf = (rec) => { const a = defOf(rec); return a ? a.atk || 0 : 0; };
const rangeOf = (rec) => { const a = defOf(rec); return a ? a.range || 0 : 0; };
const critOf = (rec) => { const a = defOf(rec); return a ? a.crit || 0 : 0; };
const piercesOf = (rec) => !!(defOf(rec) && defOf(rec).pierce);
const drains = (rec) => !!(rec && !(defOf(rec) || {}).noDrain);
function guard(rec, n) { const a = defOf(rec); return a && a.guard && n > 1 ? Math.max(1, n - a.guard) : n; }

// ตีปกติลงแล้ว (attack.strike → fodlan.onStrikeLanded) · target ยังไม่ตัดสินตาย
function landed(ctx, s, H, p, rec, target) {
  const a = defOf(rec);
  if (!a || !target || !p.pos) return null;
  const C = ctx.combat;
  if (a.id === "wise") { if (C.healArmor) C.healArmor(p, 1); return a; }
  if (a.id === "mystic") { if (C.healHp) C.healHp(p, 1); return a; }
  if (a.id === "pious") { for (const o of H.heroes(ctx)) if (o.id !== p.id && o.alive && o.pos && H.manhattan(o.pos, p.pos) <= 2 && C.healHp) C.healHp(o, 1); return a; }
  if (!H.isMob(target) || !target.pos) return a;
  const st = target.statuses || (target.statuses = {});
  if (a.id === "rogue") st.slow = Math.max(st.slow || 0, 1);
  else if (a.id === "fierce" && ctx.rng() * 100 < a.stun) { st.stun = Math.max(st.stun || 0, 1); ctx.fx("arm_stun", { id: target.id, x: target.pos.x, y: target.pos.y }); }
  else if (a.id === "conqueror") {
    for (const o of H.mobsOf(ctx)) if (o !== target && o.alive && o.pos && H.manhattan(o.pos, target.pos) === 1) C.withEffectSource(p, () => ctx.damage(o, 1));
  } else if (a.id === "tall" && target.hp > 0) {
    const dx = Math.sign(target.pos.x - p.pos.x), dy = Math.sign(target.pos.y - p.pos.y);
    const step = Math.abs(target.pos.x - p.pos.x) >= Math.abs(target.pos.y - p.pos.y) ? { x: dx, y: 0 } : { x: 0, y: dy };
    const to = { x: target.pos.x + step.x, y: target.pos.y + step.y };
    if ((step.x || step.y) && H.tileFree(ctx, s, to.x, to.y, target.id)) { const from = { ...target.pos }; target.pos = to; ctx.fx("arm_push", { id: target.id, from, to }); ctx.bump(); }
  } else if (a.id === "oracle") {
    const dx = Math.sign(target.pos.x - p.pos.x), dy = Math.sign(target.pos.y - p.pos.y);
    const step = Math.abs(target.pos.x - p.pos.x) >= Math.abs(target.pos.y - p.pos.y) ? { x: dx, y: 0 } : { x: 0, y: dy };
    const back = H.mobsOf(ctx).find((o) => o.alive && o.pos && o.pos.x === target.pos.x + step.x && o.pos.y === target.pos.y + step.y);
    if (back) { C.withEffectSource(p, () => ctx.damage(back, 2)); ctx.fx("arm_pierce", { from: { ...target.pos }, to: { ...back.pos } }); }
  }
  return a;
}

module.exports = { ARMS, BY_ID, imgOf, armAt, defOf, atkOf, rangeOf, critOf, piercesOf, drains, guard, landed };

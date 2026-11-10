// สรุปผลแมตช์ (ผู้ใช้สั่ง 2026-11-09 — หน้าจบเกม): นับต่อฝ่ายผู้เล่น (ระบบคู่/ยูนิตที่ถูกเรียก นับที่เจ้าของ)
//  dealt = หน่วยพลังชีวิต/เกราะ/เลือดชั่วคราวที่ทำให้ผู้เล่นฝ่ายอื่นเสีย · taken = ที่ตัวเองเสีย (ทุกช่องทาง)
//  kills = ล้มผู้เล่นฝ่ายอื่น (ต้นตอ = match.effectSourceId ตอนตาย) · skills = ใช้สกิลสำเร็จ
//  จุดเรียก: combat.tookDamage / combat.instantDeath / skills.useSkill · รีเซ็ทใน lobby.startMatch · state.matchStats (view.js — หน้าจบเกม)
Object.assign(module.exports, { reset, onDamage, onKill, onSkill, publicStats });

const match = require("./match");

function ownerIdOf(p) {
  if (!p) return null;
  if (p.summon) return ownerIdOf(match.players[p.summon.ownerId]) || p.summon.ownerId;
  return p.duoOf || p.id;
}
function rec(id) {
  const all = match.matchStats || (match.matchStats = {});
  return all[id] || (all[id] = { dealt: 0, taken: 0, kills: 0, skills: 0 });
}
function reset() { match.matchStats = {}; }
function onDamage(target, sourceId) {
  const to = ownerIdOf(target);
  if (!to) return;
  const from = ownerIdOf(match.players[sourceId]);
  // ยูนิตที่ถูกเรียกเสียหาย: ไม่นับเป็น "รับ" ของเจ้าของ แต่นับเป็น "ทำ" ของคนตี (สนาม Eos: มอนเป็นยูนิตที่ถูกเรียก — ผู้ใช้แจ้ง 2026-11-10 "ตีมอนตั้งเยอะ เลขการโจมตีไม่นับ")
  if (target && target.summon) { if (from && from !== to && match.players[from] && !match.players[from].summon) rec(from).dealt += 1; return; }
  rec(to).taken += 1;
  if (from && from !== to) rec(from).dealt += 1;
}
function onKill(victim, killerId) {
  const to = ownerIdOf(victim), from = ownerIdOf(match.players[killerId]);
  if (from && to && from !== to) rec(from).kills += 1;
}
function onSkill(p) {
  const id = ownerIdOf(p);
  if (id) rec(id).skills += 1;
}
function publicStats() {
  const out = {};
  for (const [id, s] of Object.entries(match.matchStats || {})) out[id] = { ...s };
  return out;
}

// ============================================================
//  ม้าคู่ใจ — ระบบกลาง (ดิเอโก้: ซิลเวอร์ บูลเล็ต · กติกาแบบวาลคิรีของไจโร GRID_PLAN §7.11)
//  เก็บในอ็อบเจกต์สถานะของตัวละคร: { mounted, horseHp, horseReadyRound }
//   · ชั้นเลือดรับดาเมจก่อนเกราะ (ฮุค absorbDamage → absorb) · ตาย = ลงม้า + เรียกไม่ได้ cfg.cd เทิร์น แล้วกลับมาเต็ม
//   · ปุ่มพิเศษบน HUD ขึ้น/ลงม้า (hudActions → action · charAction → toggle) — 0 แต้ม · ไม่นับเป็นการใช้สกิล · ไม่ล็อกการเดิน
//  cfg = { hp, cd, name, fx(engine, p, mode) } — fx ส่งเหตุการณ์ "horse" ของตัวละครเอง (mount / dismount / die)
// ============================================================

const cdLeft = (ready, round) => Math.max(0, (ready || 0) - round);

function fresh(cfg) {
  return { mounted: true, horseHp: cfg.hp, horseReadyRound: 0 };
}
function cooldown(engine, s) {
  return s.mounted ? 0 : cdLeft(s.horseReadyRound, engine.roundNumber);
}
// ขึ้น/ลงม้า → true = เปลี่ยนจริง (ม้ายังเรียกไม่ได้ = false)
function setMounted(engine, p, s, on, cfg) {
  if (on === s.mounted) return false;
  if (on) {
    if (cdLeft(s.horseReadyRound, engine.roundNumber) > 0) return false;
    if (s.horseHp <= 0) s.horseHp = cfg.hp;
  }
  s.mounted = on;
  if (p.pos && cfg.fx) cfg.fx(engine, p, on ? "mount" : "dismount");
  engine.log(on ? `🐎 ${p.name} ขึ้นม้า${cfg.name}` : `🐎 ${p.name} ลงจากม้า`);
  return true;
}
// รับดาเมจ 1 หน่วยแทนเกราะ → true = ม้ารับไว้
function absorb(engine, p, s, cfg) {
  if (!s.mounted || s.horseHp <= 0) return false;
  s.horseHp--;
  if (s.horseHp <= 0) {
    s.mounted = false;
    s.horseReadyRound = engine.roundNumber + cfg.cd;
    if (p.pos && cfg.fx) cfg.fx(engine, p, "die");
    engine.log(`🐎 ม้า${cfg.name}ของ ${p.name} ล้ม — เรียกไม่ได้ ${cfg.cd} เทิร์น`);
  }
  return true;
}
function action(engine, p, s) {
  const cd = cooldown(engine, s);
  return { key: "horse", icon: "🐎", name: s.mounted ? "ลงม้า" : "ขึ้นม้า", on: s.mounted, cd, disabled: !engine.canAct(p) || cd > 0 };
}
function toggle(engine, p, s, cfg) {
  if (!engine.canAct(p)) return false;
  const ok = setMounted(engine, p, s, !s.mounted, cfg);
  if (ok) engine.broadcastState();
  return ok;
}

module.exports = { fresh, cooldown, setMounted, absorb, action, toggle };

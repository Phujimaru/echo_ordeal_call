// ============================================================
//  ตัวอัญเชิญของ Master (characters/master.js · GRID_PLAN §7.34) — ฮุครายตัวของยูนิต characterId "master_summon"
//  ลงทะเบียนใน CHAR_HOOKS แต่ไม่อยู่ใน MODULES (ไม่รับฮุคกระจาย) · AI คุม (server/unitAi.js) · เดินหลังผู้เล่นทุกคน
//   Undead   5 · พิษ · Zombie · เดิน 3 · ตี 1 ติดตัว · ตาย → เลือด 1 + สตั้น → ต้นเทิร์นหน้าฟื้น 1 (ครั้งเดียวต่อตัว · ระหว่างรอตายไม่ได้)
//   Raider   3 · ไม่มีธาตุ · Metal · เดิน 2 · ยิง 1 ในกรอบ 5×5 รอบตัว
//   Blessed  5 · แสง · Holy · เดิน 3 · ตี 1 ติดตัว · ติดอ่อนแอ +1 Lv (Lv2 · 3 เทิร์น)
//   Holy Crusader 3 · แสง · Holy · เดิน 2 · ยิง 1 ในกรอบ 5×5 · ติดเชื่องช้า +1 Lv (Lv2 · 3 เทิร์น)
//  เกราะ 0 ทุกตัว (ผู้ใช้)
// ============================================================
const kindOf = (u) => (u && u.summon && u.summon.masterKind) || null;
const spec = (u) => { const k = kindOf(u); return k ? require("./master").SUMMONS[k] : null; };
const cheb = (a, b, bs = 1) => Math.max(
  Math.max(0, a.x - (b.x + bs - 1), b.x - a.x),
  Math.max(0, a.y - (b.y + bs - 1), b.y - a.y),
);

module.exports = {
  id: "master_summon",
  attackBaseOverride() { return 1; },
  attackElement(engine, u) { const d = spec(u); return d ? d.el : null; },
  attackSound(u) { const d = spec(u); return d && d.sound ? d.sound : null; },
  attackStyle(u) { const k = kindOf(u); return k ? `master_${k}` : null; },
  // Raider / Holy Crusader: กรอบ 5×5 รอบตัว (เชบีเชฟ 2) — range [1, 4] แมนฮัตตัน + ด่านนี้
  strikeAllows(u, t) {
    const d = spec(u);
    if (!d || !d.box || !u.pos || !t || !t.pos) return true;
    const ts = Math.max(1, (t.boardSize | 0) || 1);
    return cheb(u.pos, t.pos, ts) <= d.box;
  },
  onStrikeLanded(engine, u, t, { counter } = {}) {
    const d = spec(u);
    if (!d || !d.curse || counter || !t || !t.alive) return null;
    require("./master").stackLv(engine, t, d.curse);
    return null;
  },
  deathless(engine, u) {
    const d = spec(u);
    if (!d || !d.revive) return false;
    if (u.summon.down != null) { u.hp = Math.max(1, u.hp); return true; }
    if (u.summon.revived) return false;
    u.summon.revived = true;
    u.summon.down = engine.roundNumber || 0;
    u.hp = 1;
    engine.applyDebuff(u, "stun", 1, 1);
    engine.log(`🧟 ${u.name} ล้มลง… แต่ยังขยับอยู่`);
    return true;
  },
  masterState(engine, u) {
    const k = kindOf(u);
    if (!k) return undefined;
    return { summon: k, standee: spec(u).img, down: u.summon.down != null };
  },
  severables() { return []; },
};

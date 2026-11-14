// Road Trip (GRID_PLAN §8.8 · .claude/plans/roadtrip-contract.md §2): ตารางความยาก 3 ระดับ
//  grow = มอนเลือด/พลังโจมตีเพิ่มต่อ 10 กม. · count = คูณจำนวนมอน · fuel = คูณน้ำมันที่ใช้ · price = คูณราคา
//  revive = ราคาขนนกคืนชีพที่มินิมาร์ท (null = ไม่ขายประจำ — สุ่มเป็นของหายาก) · autoRevive = ฟื้นอัตโนมัติ 50% หลังสู้
const DIFF = {
//  ปรับสมดุล 2026-11-14 (ผู้ใช้: "ยาก/ปานกลาง ระยะทางกับบอสไม่สมเหตุสมผล ผ่านไม่ได้" · ค่า Claude ตั้ง):
//  QA 2026-11-14 (จำลองสู้จบจริง): grow ปกติ 0.05 → 0.04 · ยาก 0.07 → 0.055 (กม. 150 ยาก มอนเลือด ×2 พลังโจมตี +50% ผู้เล่นไม่โตตาม)
//  bossHp = คูณเลือดบอส · bossGrow = เลือดบอสเพิ่มต่อบอสตัวถัดไป (แทนการโตตามกม.) · bossAtk = บวกพลังโจมตีบอส
  easy: { grow: 0.03, count: 0.8, fuel: 0.7, price: 0.8, revive: 6, autoRevive: true, hazard: 1, bossHp: 0.8, bossGrow: 0.15, bossAtk: -1 },
  normal: { grow: 0.04, count: 1, fuel: 1, price: 1, revive: 10, autoRevive: false, hazard: 2, bossHp: 1, bossGrow: 0.2, bossAtk: 0 },
  hard: { grow: 0.055, count: 1.15, fuel: 1.15, price: 1.15, revive: null, autoRevive: false, hazard: 3, bossHp: 1.15, bossGrow: 0.25, bossAtk: 0 },
};
const DIFFS = Object.keys(DIFF);
const diffOf = (rt) => DIFF[(rt && rt.diff) || "normal"] || DIFF.normal;
const priceOf = (rt, base) => Math.max(1, Math.ceil(base * diffOf(rt).price));
module.exports = { DIFF, DIFFS, diffOf, priceOf };

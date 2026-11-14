// Road Trip (GRID_PLAN §8.8 · .claude/plans/roadtrip-contract.md §2): ตารางความยาก 3 ระดับ
//  grow = มอนเลือด/พลังโจมตีเพิ่มต่อ 10 กม. · count = คูณจำนวนมอน · fuel = คูณน้ำมันที่ใช้ · price = คูณราคา
//  revive = ราคาขนนกคืนชีพที่มินิมาร์ท (null = ไม่ขายประจำ — สุ่มเป็นของหายาก) · autoRevive = ฟื้นอัตโนมัติ 50% หลังสู้
const DIFF = {
  easy: { grow: 0.04, count: 0.8, fuel: 0.7, price: 0.8, revive: 6, autoRevive: true, hazard: 1 },
  normal: { grow: 0.07, count: 1, fuel: 1, price: 1, revive: 10, autoRevive: false, hazard: 2 },
  hard: { grow: 0.11, count: 1.3, fuel: 1.3, price: 1.25, revive: null, autoRevive: false, hazard: 3 },
};
const DIFFS = Object.keys(DIFF);
const diffOf = (rt) => DIFF[(rt && rt.diff) || "normal"] || DIFF.normal;
const priceOf = (rt, base) => Math.max(1, Math.ceil(base * diffOf(rt).price));
module.exports = { DIFF, DIFFS, diffOf, priceOf };

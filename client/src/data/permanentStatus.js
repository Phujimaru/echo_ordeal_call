// สถานะที่ "ไม่นับถอยหลังเทิร์น" — ค่าใน p.statuses เป็นสแตค/ธง ไม่ใช่จำนวนเทิร์นที่เหลือ
// ต้องตรงกับ NO_TICK_STATUS ใน characters/_universal_status.js ฝั่งเซิร์ฟเวอร์เสมอ
// (มีเทสต์ tests/permanentStatus.test.js คอยกันไม่ให้สองฝั่งหลุดจากกัน)
export const PERMANENT_STATUS_KEYS = new Set([
  "empower", "evade", "fortune", "hbleed", "hburn",
]);

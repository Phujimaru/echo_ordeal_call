// ============================================================
//  ตัวกลางกันป้ายประกาศซ้อนกัน (ผู้ใช้สั่ง 2026-11-10: ป้ายร้านค้าปรากฏ "อย่าให้แสดงพร้อมกับการแจ้งเตือนฉาก")
//  ป้ายที่กำลังขึ้นจอลงชื่อไว้ (begin/end) · ป้ายอื่นที่ต้องรอ = ถาม busy(except) หรือ subscribe แล้วค่อยแสดง
//  ชื่อที่ใช้: "shop" (ร้านค้าปรากฏ — screens/Game.jsx) · "zone" (ป้ายเข้าพื้นที่สนาม Eos — eos/EosZoneCard.jsx)
//   ฉากเปลี่ยนเทิร์น/จั่วไพ่/โจมตี อยู่ในคิวฉากของ Game.jsx อยู่แล้ว (ไม่ซ้อนกันเอง)
// ============================================================
const active = new Set();
const subs = new Set();
const emit = () => { for (const f of [...subs]) { try { f(); } catch { /* ผู้ฟังพัง ไม่กระทบตัวอื่น */ } } };

export function beginNotice(name) { if (!active.has(name)) { active.add(name); emit(); } }
export function endNotice(name) { if (active.delete(name)) emit(); }
// มีป้ายอื่น (ไม่นับชื่อ except) ขึ้นอยู่ไหม
export function noticeBusy(except = null) { for (const n of active) if (n !== except) return true; return false; }
export function onNotice(f) { subs.add(f); return () => subs.delete(f); }

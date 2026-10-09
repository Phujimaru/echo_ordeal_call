// พักการวาดกระดาน — ฉากทึบเต็มจอ (ฉากเดินทาง / คัตซีนวีดีโอ) บังกระดานอยู่ ไม่ต้องวาดใหม่ทุกเฟรมให้เครื่องทำงานซ้อนสองเท่า
//  holdBoard() คืนฟังก์ชันปล่อย · ระหว่างพัก BoardCanvas ยังอบชั้นนิ่งไว้ล่วงหน้า (แผนที่ใหม่) แต่ไม่วาดเฟรม
const holds = new Set();

export function holdBoard() {
  const token = {};
  holds.add(token);
  return () => { holds.delete(token); };
}

export function boardPaused() {
  return holds.size > 0;
}

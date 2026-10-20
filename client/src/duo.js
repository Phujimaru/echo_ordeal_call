// ============================================================
//  ระบบคู่ (เคท & เอมิลิโกะ — server/duo.js) ฝั่ง client
//   ผู้เล่น 1 คนคุม 2 ตัว: ตัวที่สองมาเป็นระเบียนแยกใน state.players ที่มี `duoOf` = id เจ้าของ
//   · รายชื่อผู้เล่น (ลำดับเดิน/หน้าจบเกม/รายชื่อ) ใช้ rosterOf — ตัดตัวที่สองออก แต่กระดานยังวาดครบทุกตัว
//   · เจ้าของที่ล้ม (alive=false) ขณะตัวที่สองยังอยู่ = ผู้เล่นยังอยู่ในเกม (sideAlive)
// ============================================================

// id ฝ่าย (= id เจ้าของ) — ตัวละครทั่วไป = id ตัวเอง
export const sideOf = (p) => (p ? p.duoOf || p.id : null);
export const sameSide = (a, b) => !!a && !!b && sideOf(a) === sideOf(b);
// ผู้เล่นจริงเท่านั้น (ตัดตัวที่สองของระบบคู่ + ยูนิตที่ถูกเรียก p.summon — ร่างแยก/ตัวที่เหมือนกันของวาเลนไทน์ · GRID_PLAN §7.13)
export const rosterOf = (players) => (players || []).filter((p) => p && !p.duoOf && !p.summon);
// ฝ่ายของ p ยังมีตัวรอดอยู่ไหม
export function sideAlive(p, players) {
  if (!p) return false;
  if (p.alive) return true;
  const sid = sideOf(p);
  return (players || []).some((q) => q && q.alive && sideOf(q) === sid);
}
// รายชื่อผู้เล่นสำหรับหน้าจอที่นับ "ยังอยู่ในเกม" จาก alive (หน้าจบเกม/ลำดับ) — เจ้าของที่ล้มแต่คู่ยังรอด = alive
export function rosterAlive(players) {
  return rosterOf(players).map((p) => (p.alive || !sideAlive(p, players) ? p : { ...p, alive: true }));
}
// ทุกตัวของฝ่าย p เรียง [เจ้าของ, ตัวที่สอง]
export function unitsOfSide(p, players) {
  const sid = sideOf(p);
  if (!sid) return [];
  const list = (players || []).filter((q) => q && sideOf(q) === sid);
  return list.sort((a, b) => (a.duoOf ? 1 : 0) - (b.duoOf ? 1 : 0));
}

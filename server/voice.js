// ============================================================
//  เสียงพากย์ตามเหตุการณ์ — ระบบกลาง (GAME_SYSTEM §23 · ต้นแบบ ไจโร เซปเปลี่)
//  ตัวละครบอกรายการคีย์เสียง (client/src/audio.js FILES) ต่อเหตุการณ์ผ่านฮุค voiceLines(p) → { [event]: [key…] }
//   "turn"     = ถึงตาเดินของตัวเอง (nextActor — ไม่นับตาที่ถูกข้ามเพราะสตั้น)
//   "strike"   = ตีปกติ/ตีสวน (attack.strike — รวมตีพลาด)
//   "struck"   = โดนตีปกติ/ตีสวน (หลบพ้น = ไม่ดัง)
//   "basic" | "secondary" | "ultimate" = ใช้สกิลช่องนั้นสำเร็จ (skills.useSkill หลังลงผล)
//  หลายคีย์ = สุ่มแบบไม่ซ้ำจนครบชุด แล้วเริ่มชุดใหม่ (ประโยคท้ายชุดไม่ขึ้นต้นชุดถัดไป) · ส่ง socket "sfx" { sound, voice: playerId } — client ตัดเสียงพากย์เก่าของคนเดียวกันก่อนเล่นใหม่
//  ไม่มีฮุค/ไม่มีคีย์ = เงียบ (ไม่แตะ Math.random — เทสต์ที่ล็อกลำดับสุ่มของตัวอื่นไม่เพี้ยน)
// ============================================================
Object.assign(module.exports, { play, linesOf });

const CHAR_HOOKS = require("../characters/index");
const { engine } = require("./engine");

function linesOf(p, event) {
  const hook = p && CHAR_HOOKS[p.characterId];
  if (!hook || typeof hook.voiceLines !== "function") return [];
  let lines = null;
  try { lines = hook.voiceLines(p); } catch (err) { console.error(`[hook] ${hook.id}.voiceLines โยน error:`, err); }
  const list = lines && lines[event];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}
// ถุงสุ่มต่อผู้เล่นต่อเหตุการณ์ (p.voiceBag): หยิบออกทีละคีย์จนหมดถุง
function nextLine(p, event, list) {
  const bags = p.voiceBag || (p.voiceBag = {});
  const b = bags[event] || (bags[event] = { left: [], last: null });
  b.left = b.left.filter((k) => list.includes(k));
  if (!b.left.length) b.left = list.filter((k) => k !== b.last);
  const key = b.left.splice(Math.floor(Math.random() * b.left.length), 1)[0];
  b.last = key;
  return key;
}
// เล่นเสียงพากย์ของ p สำหรับเหตุการณ์นี้ → คีย์ที่เล่น | null
function play(p, event) {
  const list = linesOf(p, event);
  if (!list.length) return null;
  const key = list.length > 1 ? nextLine(p, event, list) : list[0];
  engine.sfx(key, null, { voice: p.id });
  return key;
}
